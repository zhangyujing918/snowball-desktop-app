# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月13日

OLDSnowballMatrixApproximation
--------------------------------

Description:
This module is used to solve the Fokker Plank corresponding to the snowball product
under the BSM model. This is the specific solution process.

The knockout probability can be roughly obtained by solving for each knockout
observation period.

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

class SnowballMatrixApproximation(SnowballDiscrete):

    def __init__(self, r, vol, Nx, t, x0, up, down, Nt, num_eigenvalue=None):
        super().__init__(r, vol, Nx, t, x0, up, down)
        self.result_coefficient = None
        self.approximate = None
        self.ut = None
        self.tck = None
        self.number_of_eigenvalue = int(0.6*self.Nx) if num_eigenvalue is None else num_eigenvalue

        self.time_array1 = np.arange(30, self.t*360+30, 30) / 360  # 生成定期更换网格的时间点
        num = Nt - self.time_array1.shape[0]
        self.time_array2 = np.linspace(1/12, self.t, num+2)[1:-1]  # 生成剩下的时间点
        self.tvec = np.sort(np.concatenate((self.time_array1, self.time_array2)))  # 将时间点进行排序
        self.tvec = np.unique(self.tvec)  # 删除重复的时间点

        self.result = {}       # 储存每个网格的初始条件
        self.xvec_dict = {}    # 储存每个网格的spatial space
        self.start_time = None # 当前所用网格的初始条件对应的时间

        self.out_proba = {}                 # 储存敲出概率
        self.in_proba = None                # 储存敲入概率
        self.double_no_touch_proba = None   # 储存未敲出未敲入的概率

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
            self.solve(_time)  # 先在旧网格中求出该值，再在新的网格中做插值
            # 如果时间不是第一个敲出观察日，说明此时不是处在 3 个月节点，需要插值获取旧网格的样条对象
            self.tck = spi.splrep(self.xvec, np.real(self.ut), k=3)

        # 初始化（更新） GBM 的解域
        _s = self.vol * np.sqrt(_time)  # 标准差参数
        _scale = np.exp(self.r * _time) * self.x0  # 缩放参数
        _p_min = 1e-10
        _p_max = 1 - 1e-10
        self.x_min = lognorm.ppf(_p_min, _s, scale=_scale)
        self.x_max = lognorm.ppf(_p_max, _s, scale=_scale)
        self.xvec = np.linspace(self.x_min, self.x_max, self.Nx+1)  # 初始化（更新）解域
        self._dx = np.diff(self.xvec)  # 初始化（更新） spatial step
        print(round(_time, 2), ': ', self.x_min, self.x_max)

        if _time == self.time_array1[0]:
            # 如果处在 3 个月时间点，需要将初始条件设置为 Lognormal 的 PDF
            self.u0 = self.analytical(_time)
        elif _time in self.time_array1[1:]:
            # 如果不是处在 3 个月时间点，需要获取插值来更新网格的初始条件
            self.u0 = spi.splev(self.xvec, self.tck)
            self.u0[self.u0<0] = 0  # 插值时有可能插出负数，将负数替换为0

        # 储存敲出概率，在每一个敲出观察日，都会有一定的概率敲出（使用新的网格进行判断）
        _, idx = self.index_of_first(self.xvec, self.up, self.down)
        self.out_proba[_time] = np.sum(self.u0[idx:] *
                                       np.array([self._dx[0]] + list(self._dx))[idx:])

        self.u0[idx:] = 0

        self.result[_time] = self.u0.copy()
        self.xvec_dict[_time] = self.xvec
        self.start_time = _time

        # 将敲出部分的 PDF 设置为 0。本质是解了1个 PDF，即不敲出的部分，但实际上应该拆为两部分。
        # self.u0[idx:] = 0

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

    def _get_coefficient(self):
        """ 求解特征向量对应的系数以及残差 """
        self.b = np.array(list(self.u0) + [0] * self.vectors.shape[1])
        self.coefficient = np.linalg.solve(self.matrix, self.b)

    def solve(self, _time):
        self.result_coefficient = self.coefficient[:self.values.shape[0]] * np.exp(np.real(self.values) * (_time-self.start_time))
        self.approximate = np.sum(self.result_coefficient[:, np.newaxis] * self.vectors.T, axis=0)
        self.ut = self.approximate

    def get_proba(self):
        for _time in self.tvec:
            if _time in self.time_array1:
                self._set_initial_condition(_time)
                self._set_matrix()
                self._eigen_value_vector()
                self._get_matrix()
                self._get_coefficient()
                self.solve(_time)
            else:
                self.solve(_time)

        min_idx, max_idx = self.index_of_first(self.xvec, self.up, self.down)
        self.in_proba = np.sum(self.u0[:min_idx+1] *
                               np.array([self._dx[0]] + list(self._dx))[:min_idx+1])
        self.double_no_touch_proba = np.sum(self.u0[min_idx+1:max_idx] *
                                            np.array([self._dx[0]] + list(self._dx))[min_idx+1:max_idx])
        total_proba = sum(self.out_proba.values())+self.in_proba+self.double_no_touch_proba
        print(f"敲出的概率为：{sum(self.out_proba.values()) / total_proba}")
        print(f"敲入的概率为：{self.in_proba / total_proba}")
        print(f"不敲出不敲入的概率为：{self.double_no_touch_proba / total_proba}")


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
    sma = SnowballMatrixApproximation(r=r, vol=vol, Nx=Nx, t=t, x0=x0, up=up, down=down, Nt=Nt)
    sma.get_proba()
    visua_time = np.arange(30, sma.t * 360 + 30, 30) / 360
    data_list = []
    for _time in sma.time_array1:
        if _time in visua_time:
            data = pd.DataFrame()
            data.index = sma.xvec_dict[_time]
            data[_time] = sma.result[_time]
            data_list.append(data)
    data = pd.concat(data_list, axis=1)
    data.plot()
    plt.title('Numerical')
    plt.show()

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

