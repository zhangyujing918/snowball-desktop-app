# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月13日

SnowballMatrixApproximation
--------------------------------

Description:
This module is used to solve the Fokker Plank corresponding to the snowball product
under the BSM model. This is the specific solution process.

Solving PDF at smaller intervals requires changing the initial conditions instead
of sharing one initial condition with one grid.

If we evolve a PDF that doesn't knock out, we can get a plausible knock-out probability,
and we want to know how the knock-out probability would change if we split it into a PDF
that has been knock-in and a PDF that has neither been knock-out nor knock-in, and in
this case, the dynamic exchange of the two PDFs also helps us to find the knock-in
probability and the probability of neither knock-out nor knock-in.

Version History:
1.0.0 - 2023-11-13
    - Codebase implementation.
1.0.1 - 2023-11-15
    - Introduce and evolve the knockout part of the PDF instead of simply accumulating
      the knockout probability on the knockout observation day as before. Remove Method I
      and Method II.
1.0.2 - 2023-11-17
    - Record the information before and after interpolation.
1.0.3 - 2023-11-22
    - Apply the Simpson integral method.
1.0.4 - 2023-11-29
    - Adjust the order of the solution, transfer the probability first, and then interpolate.
      Reduce code coupling.
"""
import numpy as np
import pandas as pd
import scipy.sparse as sp
import scipy.linalg as scl
import scipy.integrate as sci
import scipy.interpolate as spi
from scipy.stats import lognorm
from Auxiliary.NonUniformGrid import generate_custom_grid
from AnalyticalMethod.SnowballFokkerPlank import SnowballDiscrete
import json

class PDF:
    """ 实现 Knock-out, Knock-in, Double no touch
        以 Knock-out 为例，说明某一天的质量是如何转化的

        Step1. Evolve at t based on x-vector

          |            ***
          |          **   **
          |         **     **
          |       ***       ***
          |     ***           ***
          |--------------------------------

        Step2. Transfer the mass at t based on x-vector

          |            ***
          |          ** **
          |         **  **
          |       ***  ***
          |     ***    ***
          |--------------------------------

        Step3. Interpolation at t based on new x-vector

          |              ***
          |            ** **
          |           **  **
          |         ***  ***
          |       ***    ***
          |--------------------------------
    """
    def __init__(self, name):
        self.name = name       # 名称
        self.tck = None        # 插值的样条对象
        self.last_xvec = None  # 插值之前的 x vector (truncated)
        self.u0 = None         # 当前的 PMF
        self.after_interpolation = {}    # 储存归一化后的求解结果 (PMF)，注意与 Debug 组件中的属性区分
                                         # 后续会对其优化

        # ---------------- Debug 组件 ---------------- #
        self.before_interpolate = {}     # 储存插值前的信息
        self.after_interpolate = {}      # 储存插值后的信息
        # ---------------- Debug 使用 ---------------- #

        self.before_transfer = {}        # 储存概率转移前的 PMF
        self.after_transfer = {}         # 储存概率转移后的 PMF
        self.b = None                    # 矩阵求解时的列向量（已知） Ax = b
        self.last_time = None            # 迭代求解的上一个时间
        self.coefficient = None          # 特征向量对应的系数 c
        self.result_coefficient = None   # c * exp(\lambda * t)

    def xvec_pdf(self, xvec, min_idx, max_idx):
        if self.name == 'OUT':
            self.last_xvec = xvec
            return self.last_xvec, self.u0
        elif self.name == 'KI':
            self.last_xvec = xvec[:max_idx]
            return self.last_xvec, self.u0[:max_idx]
        elif self.name == 'DNT':
            self.last_xvec = xvec[min_idx+1:max_idx]
            return self.last_xvec, self.u0[min_idx+1:max_idx]

class SnowballMatrixApproximation(SnowballDiscrete):

    def __init__(self, r, vol, Nx, t, x0, up, down, Nt, integrate_method, num_eigenvalue=None,
                 is_changed_grid=False, is_uniform=True, is_simplify=True):
        super().__init__(r, vol, Nx, t, x0, up, down)
        self.OUT = PDF('OUT')
        self.KI = PDF('KI')
        self.DNT = PDF('DNT')
        self.integrate_method = integrate_method
        self.number_of_eigenvalue = int(self.Nx+1) if num_eigenvalue is None else int(num_eigenvalue)
        self.is_changed_grid = is_changed_grid
        self.is_uniform = is_uniform
        self.is_simplify = is_simplify
        self.pdf_list = [self.OUT, self.KI, self.DNT]
        # self.pdf_list = [self.OUT, self.DNT]

        self.out_observe_day = np.arange(30, self.t * 360 + 30, 30) / 360  # 生成定期更换网格的时间点
        num = Nt - self.out_observe_day.shape[0]
        self.other_time = np.linspace(1 / 12, self.t, num + 2)[1:-1]  # 生成剩下的时间点
        self.tvec = np.sort(np.concatenate((self.out_observe_day, self.other_time)))  # 将时间点进行排序
        self.tvec = np.unique(self.tvec)  # 删除重复的时间点

        # PDF.before_transfer, PDF.after_transfer 使用索引 [0, 0, 1, 2,..., n-1] 调取x-vector和dx-vector
        # PDF.after_interpolation 使用索引 [0, 1, 2, 3,..., n] 调取x-vector和dx-vector
        self.xvec_dict = {}             # 储存每个网格的spatial space
        self.dx_dict = {}               # 储存每个网格的spatial step

        self.out_proba = None           # 储存敲出概率
        self.in_proba = None            # 储存敲入概率
        self.dnt_proba = None           # 储存未敲出未敲入的概率

        self.incre_out_proba = {}       # 储存增量敲出概率
        self.error = 1e-15              # 截断的概率

        self.dense_range = self.x0 * 0.05

    @staticmethod
    def index_of_first(arr, _max, _min):
        min_index = np.searchsorted(arr, _min, side='left') - 1
        max_index = np.searchsorted(arr, _max, side='right')
        min_index = min_index if min_index >= 0 else -1
        max_index = max_index if max_index<arr.size else -1
        return min_index, max_index

    @staticmethod
    def get_data(idx, col, ut, dx):
        df = pd.DataFrame(index=idx)
        df[col] = ut
        df['dx'] = dx
        return df

    @staticmethod
    def integrate(pdf, xvec, dx, method):
        if method == 'inner_product':
            proba = pdf @ dx
        elif method == 'simps':
            proba = sci.simps(pdf, xvec)
        elif method == 'trapz':
            proba = sci.trapz(pdf, xvec)
        elif method == 'quad':
            y = spi.interp1d(xvec, pdf, 'cubic')
            f = lambda x: y(x)
            proba, _ = sci.quad(f, xvec[0], xvec[-1])
        return proba

    def _set_grid(self, _time):
        """ 初始化（更新） GBM 的解域 """
        s = self.vol * np.sqrt(_time)                                      # 标准差参数
        scale = np.exp((self.r - 0.5 * self.vol ** 2) * self.t) * self.x0  # 缩放参数
        self.x_min = lognorm.ppf(self.error, s, scale=scale)
        self.x_max = lognorm.ppf(1-self.error, s, scale=scale)
        if self.is_uniform:
            self.xvec = np.linspace(self.x_min, self.x_max, self.Nx + 1)
        else:
            self.xvec = generate_custom_grid(self.x_min, self.x_max, self.down, self.up, self.Nx+1,
                                             dense_range=self.dense_range, dense_factor=2)
        self._dx = np.diff(self.xvec)
        self.total_dx = np.zeros(shape=self.xvec.shape)
        self.total_dx[0] = self._dx[0] / 2
        self.total_dx[-1] = self._dx[-1] / 2
        self.total_dx[1:-1] = (self._dx[:-1] + self._dx[1:]) / 2
        self.min_idx, self.max_idx = self.index_of_first(self.xvec, self.up, self.down)

    def _initialize_conditions(self, _time):
        # ---------------#
        # Step1. 初始化
        # ---------------#
        self._set_grid(_time)
        self.OUT.u0 = self.analytical(_time)
        self.KI.u0 = self.OUT.u0.copy()
        self.DNT.u0 = self.OUT.u0.copy()
        # ---------------------------- #
        # Step2. 转移概率（首日无需转移）
        # ---------------------------- #
        self.incre_out_proba[_time] = self.integrate(self.OUT.u0[self.max_idx:], self.xvec[self.max_idx:],
                                                     self.total_dx[self.max_idx:], self.integrate_method)  # 增量敲出概率
        print(f"{round(_time, 2)}: 增量敲出概率为{self.incre_out_proba[_time]}")
        self.KI.u0[self.min_idx + 1:] = 0   # KI Non-Knock-in --> 0
        self.OUT.u0[:self.max_idx] = 0      # OUT Non-Knock-Out --> 0
        self.DNT.u0[self.max_idx:] = 0      # DNT Knock-out --> 0
        self.DNT.u0[:self.min_idx + 1] = 0  # DNT Knock-in --> 0
        # self._normalize_results(_time)
        self._store_results(_time, 'before_transfer', 'after_transfer')


    def _handle_grid_change(self, _time):
        # ------------------------------------------------------- #
        # Step1. 记录插值前的信息，可通过取消 `Debug 组件` 的注释进行
        # ------------------------------------------------------- #
        for pdf in self.pdf_list:
            # Debug 组件
            proba = self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
            temp = self.get_data(self.xvec, 'before_interp', pdf.u0, self.total_dx)
            pdf.before_interpolate[_time] = (proba, temp)

            pdf.tck = spi.splrep(*pdf.xvec_pdf(self.xvec, self.min_idx, self.max_idx), k=3)
        self._set_grid(_time)
        # --------------------------- #
        # Step2. 插值更新网格的初始条件
        # --------------------------- #
        for pdf in self.pdf_list:
            pdf.u0 = np.zeros(shape=self.xvec.shape)
            within_range = (self.xvec >= pdf.last_xvec.min()) & (self.xvec <= pdf.last_xvec.max())
            pdf.u0[within_range] = spi.splev(self.xvec[within_range], pdf.tck)
            pdf.u0[pdf.u0 < 0] = 0  # 插值时有可能插出负数，将负数替换为0 （稳健操作）
            proba = self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
            pdf.u0 = pdf.u0 / proba * pdf.before_interpolate[_time][0]  # Normalize
            # Debug 组件
            proba = self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
            assert np.allclose(proba, pdf.before_interpolate[_time][0]), f"{pdf.name} 插值前后的质量不相等"
            temp = self.get_data(self.xvec, 'after_interp', pdf.u0, self.total_dx)
            pdf.after_interpolate[_time] = (proba, temp)

    def _update_conditions_for_subsequent_days(self, _time):
        # ---------------------- #
        # Step1. 求解当日的 PMF
        # ---------------------- #
        for pdf in self.pdf_list:
            self._get_coefficient(pdf)
            self._get_ut(pdf, _time)
        # self._normalize_results(_time)
        self._store_results(_time, 'before_transfer')
        # --------------- #
        # Step2. 转移概率
        # --------------- #
        out1 = self.integrate(self.DNT.u0[self.max_idx:], self.xvec[self.max_idx:],
                              self.total_dx[self.max_idx:], self.integrate_method)
        out2 = self.integrate(self.KI.u0[self.max_idx:], self.xvec[self.max_idx:],
                              self.total_dx[self.max_idx:], self.integrate_method)
        self.incre_out_proba[_time] = out1 + out2
        print(f"{round(_time, 2)}: 增量敲出概率为{self.incre_out_proba[_time]}")
        self.KI.u0[:self.min_idx + 1] += self.DNT.u0[:self.min_idx + 1]  # DNT Knock-in --> KI Knock-in
        self.OUT.u0[self.max_idx:] += self.DNT.u0[self.max_idx:]         # DNT Knock-out --> OUT Knock-out
        self.OUT.u0[self.max_idx:] += self.KI.u0[self.max_idx:]          # KI Knock-out --> OUT Knock-out
        self.KI.u0[self.max_idx:] = 0       # KI Knock-out --> 0
        self.DNT.u0[self.max_idx:] = 0      # DNT Knock-out --> 0
        self.DNT.u0[:self.min_idx + 1] = 0  # DNT Knock-in --> 0
        # self._normalize_results(_time)
        self._store_results(_time, 'after_transfer')
        # ----------------------------- #
        # Step3. 若更换网格，进行插值处理
        # ----------------------------- #
        if self.is_changed_grid:
            self._handle_grid_change(_time)

    def _normalize_results(self, _time):
        """ 归一化 """
        numerical_proba = sum([self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
                               for pdf in self.pdf_list])
        analytical_proba = 1 - 2 * self.error
        for pdf in self.pdf_list:
            pdf.u0 = pdf.u0 / numerical_proba * analytical_proba

    def _store_results(self, _time, *args):
        """ 储存归一化后的结果 """
        for pdf in self.pdf_list:
            for arg in args:
                if hasattr(pdf, arg) and isinstance(getattr(pdf, arg), dict):
                    target_dict = getattr(pdf, arg)
                    target_element = getattr(pdf, 'u0')
                    target_dict[_time] = target_element.copy()

    def _set_initial_condition(self, _time):
        """ 只有时间处在 `敲出观察日` 中时，该函数才被执行。"""
        if _time == self.out_observe_day[0]:
            self._initialize_conditions(_time)
        elif _time in self.out_observe_day[1:]:
            self._update_conditions_for_subsequent_days(_time)
        self._normalize_results(_time)
        self._store_results(_time, 'after_interpolation')
        self.xvec_dict[_time] = self.xvec
        self.dx_dict[_time] = self.total_dx

    def _eigen_value_vector(self):
        """ 计算绝对值最小的部分特征值 """
        if self.number_of_eigenvalue in [self.Nx, self.Nx+1]:
            self.values, self.vectors = scl.eig(self.A.toarray())
        else:
            self.values, self.vectors = sp.linalg.eigs(self.A, self.number_of_eigenvalue, which='SM')  # The absolute value is minimal

    def _get_matrix(self):
        """ 获取系数矩阵 """
        V_block = self.vectors
        I_block = np.eye(self.vectors.shape[0])
        Zero_block = np.zeros((self.vectors.shape[1], self.vectors.shape[1]))
        Vt_block = self.vectors.T
        self.matrix = np.block([[V_block, I_block], [Zero_block, Vt_block]])

    def _get_coefficient(self, pdf):
        """ 求解特征向量对应的系数以及残差 """
        pdf.b = np.array(list(pdf.u0) + [0] * self.vectors.shape[1])
        pdf.coefficient = np.linalg.solve(self.matrix, pdf.b)

    def _get_ut(self, pdf, _time):
        pdf.result_coefficient = pdf.coefficient[:self.values.shape[0]] * np.exp(np.real(self.values) * (_time - pdf.last_time))
        # 更新每个 PDF 的初始条件
        pdf.u0 = np.real(np.sum(pdf.result_coefficient[:, np.newaxis] * self.vectors.T, axis=0))
        if pdf.u0.min() < 0:
            pdf.u0 += np.abs(pdf.u0.min())  # 求解时有可能会有负数，-1e-18左右

    def _calculate_display_result(self):
        self.out_proba = self.integrate(self.OUT.u0, self.xvec, self.total_dx, self.integrate_method)
        self.in_proba = self.integrate(self.KI.u0, self.xvec, self.total_dx, self.integrate_method)
        self.dnt_proba = self.integrate(self.DNT.u0, self.xvec, self.total_dx, self.integrate_method)
        total_proba = self.out_proba + self.in_proba + self.dnt_proba
        print(f"敲出的概率为：{self.out_proba}")
        print(f"敲入的概率为：{self.in_proba}")
        print(f"不敲出不敲入的概率为：{self.dnt_proba}")
        print(f"总概率：{total_proba}")

    def _handle_out_observe_day(self, _time):
        self._set_initial_condition(_time)
        self._set_matrix_simplify() if self.is_simplify else self._set_matrix()
        self._eigen_value_vector()
        self._get_matrix()
        for pdf in self.pdf_list:
            pdf.last_time = _time

    def _handle_non_out_observe_day(self, _time):
        self.xvec_dict[_time] = self.xvec
        self.dx_dict[_time] = self.total_dx
        for pdf in [self.KI, self.DNT]:   # 解 2 个 PDF
            self._get_coefficient(pdf)    # 因为更换 u0，所以每次都需要求解一下系数
            self._get_ut(pdf, _time)      # 使用新的系数，求解下一时刻的 u0，即 ut。
            pdf.before_transfer[_time] = pdf.u0.copy()

            # ------------------------- Whether preserve mass in knock-in observation day ------------------------- #
            # proba_before = self.integrate(pdf.ut_dict[pdf.last_time], self.xvec, self.total_dx, self.integrate_method)
            # proba_now = self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
            # pdf.u0 = pdf.u0 / proba_now * proba_before  # Normalize
            # proba_now = self.integrate(pdf.u0, self.xvec, self.total_dx, self.integrate_method)
            # assert np.allclose(proba_now, proba_before), f"{pdf.name} 迭代求解前后的质量不相等"
            # ------------------------- Whether preserve mass in knock-in observation day ------------------------- #

            pdf.last_time = _time  # 更新上一时刻时间点
        self.KI.u0[:self.min_idx + 1] += self.DNT.u0[:self.min_idx + 1]  # DNT PDF Knock-in --> KI PDF Knock-in
        self.DNT.u0[:self.min_idx + 1] = 0  # DNT PDF Knock-in --> 0
        self._store_results(_time, 'after_transfer')
        # self._normalize_results(_time)
        self._store_results(_time, 'ut_dict')

    def get_proba(self):
        for _time in self.tvec:
            if _time in self.out_observe_day:  # 这是敲出观察日，只需要生成 self.pdf.u0 即可，迭代求解的起点。
                self._handle_out_observe_day(_time)
            else:
                self._handle_non_out_observe_day(_time)
        self._calculate_display_result()

    def process_29th_day(self, xvec):
        time = 29/360
        coefficient = 1 / xvec / self.vol / np.sqrt(2 * np.pi * time)
        _exp = -(np.log(xvec/self.x0) - (self.r-0.5*self.vol**2) * time) ** 2 / (2 * self.vol ** 2 * time)
        return coefficient * np.exp(_exp)

class Snowball:

    def __init__(self, r, out_coupon, dividend_coupon, notional, sma: SnowballMatrixApproximation):
        self.adj_incre_out_proba = None
        self.total_price = None
        self.in_price = None
        self.dnt_price = None
        self.out_price = None
        self.r = r
        self.out_coupon = out_coupon
        self.dividend_coupon = dividend_coupon
        self.notional = notional
        self.sma = sma
        self.discount = np.exp(-self.r * self.sma.out_observe_day)

    def get_price(self):
        self.adj_incre_out_proba = np.array(list(self.sma.incre_out_proba.values())) / \
                                   np.array(list(self.sma.incre_out_proba.values())).sum() * \
                                   self.sma.out_proba

        # 看每个敲出观察日价格
        self.out_price_process = self.discount * (self.adj_incre_out_proba * (self.sma.out_observe_day * self.out_coupon))
        self.dnt_price = self.discount[-1] * self.sma.dnt_proba * (self.sma.t*self.dividend_coupon)
        self.in_price = [-(self.sma.x0-x)/self.sma.x0 if x<self.sma.x0 else 0 for x in self.sma.xvec]
        self.in_price = (self.discount[-1] * self.sma.integrate(self.in_price*self.sma.KI.u0, self.sma.xvec,
                                                                self.sma.total_dx, 'simps'))
        self.total_price = sum(self.out_price_process) + self.in_price + self.dnt_price
        self.out_price_process *= self.notional
        self.in_price *= self.notional
        self.dnt_price *= self.notional
        self.total_price *= self.notional
        print(f'*各月敲出部分的价值为：{self.out_price_process}')
        print(f'@敲出部分的价值为：{sum(self.out_price_process)}')
        print(f'@敲入部分的价值为：{self.in_price}')
        print(f'@不敲出不敲入部分的价值为：{self.dnt_price}')
        print(f'@雪球的价值为：{self.total_price}')
        return self.out_price_process, self.dnt_price, self.in_price, self.total_price

if __name__ == '__main__':
    r = 0.03
    vol = 0.13
    Nx = 200
    Nt = 330
    x0 = 100
    t = 1
    up = 1.03
    down = 0.85
    out_coupon = 0.2
    dividend_coupon = 0.2
    notional = 100
    sma = SnowballMatrixApproximation(r=r, vol=vol, Nx=Nx, t=t, x0=x0, up=up, down=down, Nt=Nt,
                                      num_eigenvalue=None, integrate_method='inner_product',
                                      is_changed_grid=True, is_uniform=False, is_simplify=False)
    sma.get_proba()

    visua_time = np.arange(30, sma.t * 360 + 30, 30) / 360
    # ------------------ DataFrame 提取 敲出数据 ------------------------ #
    total_data_list = []
    for i, _time in enumerate(sma.out_observe_day):
        i = i if i == 0 else i - 1
        grid_time = sma.out_observe_day[i]
        data = pd.DataFrame(index=sma.xvec_dict[grid_time])
        for pdf in sma.pdf_list:
            data[f'{_time}_{pdf.name}_before_transfer'] = pdf.before_transfer[_time]
            data[f'{_time}_{pdf.name}_after_transfer'] = pdf.after_transfer[_time]
        data[f'{_time}_Snowball_before_transfer'] = (data[f'{_time}_OUT_before_transfer'] +
                                                     data[f'{_time}_DNT_before_transfer'] + data[f'{_time}_KI_before_transfer'])
        data[f'{_time}_Snowball_after_transfer'] = (data[f'{_time}_OUT_after_transfer'] +
                                                    data[f'{_time}_DNT_after_transfer'] + data[f'{_time}_KI_after_transfer'])
        total_data_list.append(data)
    final_data = pd.concat(total_data_list, axis=0)
    # final_data.to_csv('/home/develop/code/matrix-exponential/python/MatrixExponential/ko_dates_data.csv')

    # 提数据
    index_list = final_data.index.tolist()
    def process_data(data, column_name, state):
        result_list = []
        for i in range(0, 12 * t):
            df = data[f'{visua_time[i]}_{column_name}_{state}_transfer']
            result_list.append(df.dropna().tolist())
        return [item for sublist in result_list for item in sublist]

    ko_before_list = process_data(final_data, 'OUT', 'before')
    dnt_before_list = process_data(final_data, 'DNT', 'before')
    ki_before_list = process_data(final_data, 'KI', 'before')
    snb_before_list = process_data(final_data, 'Snowball', 'before')

    ko_after_list = process_data(final_data, 'OUT', 'after')
    dnt_after_list = process_data(final_data, 'DNT', 'after')
    ki_after_list = process_data(final_data, 'KI', 'after')
    snb_after_list = process_data(final_data, 'Snowball', 'after')

    # 用于decompose price
    sn = Snowball(r=r, out_coupon=out_coupon, dividend_coupon=dividend_coupon, notional=notional, sma=sma)
    ko_price_process, dnt_price_last, ki_price_last, snb_price_last = sn.get_price()

    # 处理第29天，用第30天的最大最小值，生成lognormal，analytical函数
    day29th_dist = sma.process_29th_day(np.array(index_list[0:Nx+1]))
    for i in range(0, Nx + 1):
        ki_before_list[i] = 0
        ko_before_list[i] = 0
        dnt_before_list[i] = day29th_dist[i]
        snb_before_list[i] = day29th_dist[i]

    # 生成json
    data_list = ['xvec', 'before', 'after', 'parameter', 'price']
    snb = {key: [] for key in data_list}

    snb['xvec'] = {
        'range': np.round(index_list, 4).tolist(),
        'index': None,
    }
    snb['before'] = {
        'KI': np.round(ki_before_list, 4).tolist(),
        'DNT': np.round(dnt_before_list, 4).tolist(),
        'KO': np.round(ko_before_list, 4).tolist(),
        'SNB': np.round(snb_before_list, 4).tolist()
    }
    snb['after'] = {
        'KI': np.round(ki_after_list, 4).tolist(),
        'DNT': np.round(dnt_after_list, 4).tolist(),
        'KO': np.round(ko_after_list, 4).tolist(),
        'SNB': np.round(snb_after_list, 4).tolist()
    }
    snb['parameter'] = {
        'kiInput': down * x0,
        'koInput': up * x0,
        'Nx': Nx
    }
    snb['price'] = {
        'KI': np.round(ki_price_last, 4).tolist(),
        'DNT': np.round(dnt_price_last, 4).tolist(),
        'KO': np.round(ko_price_process, 4).tolist(),
        'SNB': np.round(snb_price_last, 4).tolist()
    }
    path = '/home/develop/code/matrix-exponential/python/MatrixExponential/pricing.json'
    with open(path, 'w') as json_file:
        json.dump(snb, json_file)
    print(f'JSON数据已保存到文件: {path}')



    # ------------------ Test Case I ------------------------ #
    # pdf = sma.OUT
    # time_list = sma.out_observe_day
    # for i, _time in enumerate(time_list):
    #     if _time == sma.out_observe_day[0]:
    #         plt.plot(sma.xvec_dict[_time], pdf.before_transfer[_time], label=f'{pdf.name} before transfer: {_time}')
    #         plt.plot(sma.xvec_dict[_time], pdf.after_transfer[_time], label=f'{pdf.name} after transfer: {_time}')
    #         plt.legend()
    #         plt.show()
    #     else:
    #         last_time = time_list[i-1]
    #         plt.plot(sma.xvec_dict[last_time], pdf.before_transfer[_time], label=f'{pdf.name} before transfer: {_time}')
    #         plt.plot(sma.xvec_dict[last_time], pdf.after_transfer[_time], label=f'{pdf.name} after transfer: {_time}')
    #         plt.legend()
    #         plt.show()

    # ------------------ DataFrame 提取 全部数据（含敲入）------------------------ #
    # def find_positions(arr1, arr2):
    #     positions = []
    #     for item in arr1:
    #         if item in arr2:
    #             positions.append(np.where(arr2 == item)[0][0])
    #         else:
    #             raise ValueError(f"元素 {item} 在 arr2 中未找到")
    #     idx_list = [ (start_idx, end_idx) for start_idx, end_idx in zip(positions[:-1], positions[1:]) ]
    #     return idx_list
    #
    # idx_list = find_positions(sma.out_observe_day, sma.tvec)
    # total_data_dict = []
    # for i, (start_idx, end_idx), out_day, in zip(range(len(sma.out_observe_day)), idx_list, sma.out_observe_day):  # 循环处理每个网格
    #     tvec = sma.tvec[start_idx:end_idx + 1] if i == 0 else sma.tvec[start_idx + 1:end_idx + 1]
    #     i = i if i == 0 else i - 1
    #     grid_time = sma.out_observe_day[i]
    #
    #     data = pd.DataFrame(index=sma.xvec_dict[grid_time])
    #     for _time in tvec:  # 处理每个时间
    #         for pdf in sma.pdf_list:  # 处理每个 PDF
    #             if _time in pdf.before_transfer.keys():  # KO 在敲入观察日无数据
    #                 data[f'{_time}_{pdf.name}_before_transfer'] = pdf.before_transfer[_time]
    #                 data[f'{_time}_{pdf.name}_after_transfer'] = pdf.after_transfer[_time]
    #     total_data_dict.append(data)
    #
    # final_data = pd.concat(total_data_dict, axis=0)
    # final_data.to_excel('final_data.xlsx')
