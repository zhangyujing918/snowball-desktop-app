# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月13日

NEWSnowballMatrixApproximation
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
"""
import numpy as np
import pandas as pd
import scipy.sparse as sp
import scipy.interpolate as spi
from scipy.stats import lognorm
from AnalyticalMethod.SnowballFokkerPlank import SnowballDiscrete

class PDF:
    def __init__(self):
        self.name = None     # 名称
        self.tck = None      # 插值的样条对象
        self.b = None        # 矩阵求解时的列向量（已知） Ax = b
        self.ut_dict = {}    # 储存求解结果
        self.before_proba = {}   # 储存插值前的概率
        self.after_proba = {}    # 储存插值后的概率
        self.coefficient = None          # 特征向量对应的系数 c
        self.result_coefficient = None   # c * exp(\lambda * t)

class SnowballMatrixApproximation(SnowballDiscrete):

    def __init__(self, r, vol, Nx, t, x0, up, down, Nt, SB, OUT, KI, DNT, num_eigenvalue=None):
        super().__init__(r, vol, Nx, t, x0, up, down)
        self.SB = SB
        self.SB.name = 'SB'
        self.OUT = OUT
        self.OUT.name = 'OUT'
        self.KI = KI
        self.KI.name = 'KI'
        self.DNT = DNT
        self.DNT.name = 'DNT'
        self.number_of_eigenvalue = int(0.6*self.Nx) if num_eigenvalue is None else num_eigenvalue
        self.pdf_list = [self.SB, self.KI, self.DNT]

        self.time_array1 = np.arange(30, self.t*360+30, 30) / 360  # 生成定期更换网格的时间点
        num = Nt - self.time_array1.shape[0]
        self.time_array2 = np.linspace(1/12, self.t, num+2)[1:-1]  # 生成剩下的时间点
        self.tvec = np.sort(np.concatenate((self.time_array1, self.time_array2)))  # 将时间点进行排序
        self.tvec = np.unique(self.tvec)  # 删除重复的时间点

        self.xvec_dict = {}     # 储存每个网格的spatial space
        self.last_time = None   # 迭代求解的上一个时间

        self.out_proba = {}                 # 储存敲出概率
        self.in_proba = None                # 储存敲入概率
        self.dnt_proba = None   # 储存未敲出未敲入的概率

    @staticmethod
    def index_of_first(arr, _max, _min):
        min_index = np.searchsorted(arr, _min, side='left') - 1
        max_index = np.searchsorted(arr, _max, side='right')
        min_index = min_index if min_index >= 0 else -1
        max_index = max_index if max_index<arr.size else -1
        return min_index, max_index

    def _set_initial_condition(self, _time=0.25):
        """ 只有时间处在 self.time_array1 中时，该函数才真正被执行。"""
        if _time in self.time_array1[1:]:
            # 插值之前先输出 概率
            # 如果时间不是第一个敲出观察日，需要插值获取旧网格的样条对象
            # 如果是在敲出观察日，先在旧网格中求出该值，再在新的网格中做插值
            # 用最新的 u0 来做插值，就是上一时刻的 PDF
            self.OUT.after_proba[_time] = sum(self.out_proba.values())
            for pdf in self.pdf_list:
                self._get_ut(pdf, _time)
                pdf.before_proba[_time] = pdf.u0 @ np.insert(self._dx, 0, self._dx[0])
                # print(f"{round(_time, 2)}： {pdf.name}的插值前概率为{pdf.before_proba[_time]}")
                pdf.tck = spi.splrep(self.xvec, np.real(pdf.u0), k=3)

        # 初始化（更新） GBM 的解域
        _s = self.vol * np.sqrt(_time)  # 标准差参数
        _scale = np.exp(self.r * _time) * self.x0  # 缩放参数
        _p_min = 1e-10
        _p_max = 1 - 1e-10
        self.x_min = lognorm.ppf(_p_min, _s, scale=_scale)
        self.x_max = lognorm.ppf(_p_max, _s, scale=_scale)
        self.xvec = np.linspace(self.x_min, self.x_max, self.Nx+1)  # 初始化（更新）解域
        self._dx = np.diff(self.xvec)  # 初始化（更新） spatial step
        print(f"{round(_time, 2)}: {self.x_min}, {self.x_max}")
        self.min_idx, self.max_idx = self.index_of_first(self.xvec, self.up, self.down)

        if _time == self.time_array1[0]:
            # 如果处在第一个敲出观察日，需要将初始条件设置为 Lognormal 的 PDF
            self.SB.u0 = self.analytical(_time)
            self.KI.u0 = self.SB.u0.copy()  # 初始化
            self.DNT.u0 = self.SB.u0.copy()  # 初始化
        elif _time in self.time_array1[1:]:
            # 如果不是处在第一个敲出观察日，需要获取插值来更新网格的初始条件
            for pdf in self.pdf_list:
                pdf.u0 = spi.splev(self.xvec, pdf.tck)
                pdf.u0[pdf.u0 < 0] = 0  # 插值时有可能插出负数，将负数替换为0
                pdf.after_proba[_time] = pdf.u0 @ np.insert(self._dx, 0, self._dx[0])
                # print(f"{round(_time, 2)}： {pdf.name}的插值后概率为{pdf.after_proba[_time]}")

        # ----------------------- Method I ---------------------------------- #
        # 储存敲出概率，在每一个敲出观察日，都会有一定的概率敲出（使用新的网格进行判断）
        # self.out_proba[_time] = np.sum(self.SB.u0[self.max_idx:] *
        #                                np.array([self._dx[0]] + list(self._dx))[self.max_idx:])

        # ----------------------- Method II --------------------------------- #
        # 尝试用敲入部分的 PDF 以及未敲出未敲入部分的 PDF 去计算敲出概率
        if _time == self.time_array1[0]:
            self.out_proba[_time] = np.sum(self.SB.u0[self.max_idx:] *
                                           np.array([self._dx[0]] + list(self._dx))[self.max_idx:])
        else:
            self.out_proba[_time] = self.KI.u0[self.max_idx:] @ \
                                           np.array([self._dx[0]] + list(self._dx))[self.max_idx:]
            self.out_proba[_time] += self.DNT.u0[self.max_idx:] @ \
                                            np.array([self._dx[0]] + list(self._dx))[self.max_idx:]

        # 将敲出部分的 PDF 设置为 0。本质是解了 1 个 PDF，即不敲出的部分，但实际上应该拆为两部分。
        # 更改已经敲入部分的 PDF，以及未敲出未敲入部分的 PDF
        # 求解首日不需要交换概率
        if _time == self.time_array1[0]:
            self.KI.u0[self.min_idx+1:] = 0  # KI Non-Knock-in --> 0
        else:
            self.KI.u0[:self.min_idx+1] += self.DNT.u0[:self.min_idx+1]  # DNT PDF Knock-in --> KI PDF Knock-in
            self.KI.u0[self.max_idx:] = 0    # KI Knock-out --> 0
        self.SB.u0[self.max_idx:] = 0        # SB Knock-out --> 0
        self.DNT.u0[self.max_idx:] = 0       # DNT Knock-out --> 0
        self.DNT.u0[:self.min_idx+1] = 0     # DNT Knock-in --> 0

        for pdf in self.pdf_list:
            pdf.ut_dict[_time] = pdf.u0.copy()
        self.xvec_dict[_time] = self.xvec

    def _eigen_value_vector(self):
        """ 计算绝对值最小的部分特征值 """
        self.values, self.vectors = sp.linalg.eigs(self.A,
                                                   self.number_of_eigenvalue,
                                                   which='SM')  # The absolute value is minimal

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
        pdf.result_coefficient = pdf.coefficient[:self.values.shape[0]] * np.exp(np.real(self.values) * (_time - self.last_time))
        # 更新每个 PDF 的初始条件
        pdf.u0 = np.real(np.sum(pdf.result_coefficient[:, np.newaxis] * self.vectors.T, axis=0))

    def get_proba(self):
        for _time in self.tvec:
            if _time in self.time_array1:  # 这是敲出观察日，只需要生成 self.pdf.u0 即可，迭代求解的起点。
                self._set_initial_condition(_time)
                self._set_matrix()
                self._eigen_value_vector()
                self._get_matrix()
            else:
                self.xvec_dict[_time] = self.xvec
                for pdf in self.pdf_list:  # 解 3 个 PDF
                    self._get_coefficient(pdf)  # 因为更换 u0，所以每次都需要求解一下系数
                    self._get_ut(pdf, _time)  # 使用新的系数，求解下一时刻的 u0，即 ut。
                self.KI.u0[:self.min_idx+1] += self.DNT.u0[:self.min_idx+1]  # DNT PDF Knock-in --> KI PDF Knock-in
                self.DNT.u0[:self.min_idx+1] = 0  # DNT PDF Knock-in --> 0
                for pdf in self.pdf_list:
                    pdf.ut_dict[_time] = np.real(pdf.u0).copy()

            self.last_time = _time                        # 更新上一时刻时间点

        self.in_proba = self.KI.u0 @ np.array([self._dx[0]] + list(self._dx))  # 无关的点已经设置为 0 了
        self.dnt_proba = self.DNT.u0 @ np.array([self._dx[0]] + list(self._dx))
        total_proba = sum(self.out_proba.values())+self.in_proba+self.dnt_proba
        print(f"总概率：{total_proba}")
        print(f"平均敲出月份：{sum(key * value for key, value in self.out_proba.items())*12}")
        print(f"敲出的概率为：{sum(self.out_proba.values())}")
        print(f"敲入的概率为：{self.in_proba}")
        print(f"不敲出不敲入的概率为：{self.dnt_proba}")


if __name__ == '__main__':
    import matplotlib.pyplot as plt
    r = 0.03
    vol = 0.13
    Nx = 200
    Nt = 200
    x0 = 5000
    t = 1
    up = 1.03
    down = 0.85
    sma = SnowballMatrixApproximation(r=r, vol=vol, Nx=Nx, t=t, x0=x0, up=up, down=down, Nt=Nt, SB=PDF(), OUT=PDF(), KI=PDF(), DNT=PDF())
    sma.get_proba()
    visua_time = np.arange(30, sma.t*360+30, 30) / 360
    # data_list = []
    # for _time in sma.tvec:
    #     data = pd.DataFrame()
    #     data.index = sma.xvec_dict[_time]
    #     data[_time] = sma.KI.ut_dict[_time]
    #     data_list.append(data)
    # data = pd.concat(data_list, axis=1)
    # data = data[visua_time]
    # data.plot()
    # plt.title('Numerical')
    # plt.show()

    # ------------------- 误差测试 ------------------- #
    # data = pd.DataFrame()
    # for t in [0.25, 0.5, 0.75, 1, 1.25]:
    #     t_ = t - 0.259
    #     sma = SnowballMatrixApproximation(r=r, vol=vol, Nx=Nx, t=t_, x0=x0, Nt=Nt)
    #     sma.solve()
    #     data[t] = np.real(sma.ut)
    #     plt.plot(sma.xvec, np.real(sma.ut), label=t)
    # dx_array  =np.insert(sma._dx, 0, sma._dx[0])
    # dat = (data.iloc[:,0]*dx_array).cumsum(axis=0)
    # plt.legend()
    # plt.show()
    # print(dat.iloc[-1])

