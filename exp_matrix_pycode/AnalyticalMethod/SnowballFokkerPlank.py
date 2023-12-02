# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月8日

SnowballFokkerPlank
--------------------------

Description:
This module is used to solve the Fokker Plank corresponding to the snowball product
under the BSM model.

Version History:
1.0.0 - 2023-11-8
    - Codebase implementation.
"""
import numpy as np
import scipy.sparse as sp


class SnowballDiscrete():
    def __init__(self, r, vol, Nx, t, x0, up, down):
        # 模型参数
        self.r = r
        self.vol = vol

        # 产品参数
        self.t = t
        self.x0 = x0
        self.up = up * self.x0
        self.down = down * self.x0

        # 数值参数
        self.Nx = Nx
        self.x_max = 8000
        self.x_min = 3000
        self.xvec = np.linspace(self.x_min, self.x_max, self.Nx+1)
        self._dx = np.diff(self.xvec)
        self.number_of_eigenvalue = None

    def _set_matrix(self):
        """ 不化简 PDE """
        self.dx = self._dx[:-1]
        # 舍弃第一个元素
        self.dx_shift = self._dx[1:]

        # 一阶导数
        self.l1 = - self.dx_shift / ((self.dx + self.dx_shift) * self.dx)
        self.c1 = (self.dx_shift - self.dx) / (self.dx * self.dx_shift)
        self.u1 = self.dx / ((self.dx + self.dx_shift) * self.dx_shift)

        # 二阶导数
        self.l2 = 2 / ((self.dx + self.dx_shift) * self.dx)
        self.c2 = -2 / (self.dx * self.dx_shift)
        self.u2 = 2 / ((self.dx + self.dx_shift) * self.dx_shift)

        # 构建系数矩阵
        self.l = 0.5 * self.l2 * (self.vol ** 2) * (self.xvec[:-2] ** 2) - self.l1 * self.r * self.xvec[:-2]  # 不包括后面两个
        self.c = 0.5 * self.c2 * (self.vol ** 2) * (self.xvec[1:-1] ** 2) - self.c1 * self.r * self.xvec[1:-1]  # 不包括首尾
        self.u = 0.5 * self.u2 * (self.vol ** 2) * (self.xvec[2:] ** 2) - self.u1 * self.r * self.xvec[2:]  # 不包括前面两个
        self.l = [0] + list(self.l) + [0]
        self.c = [0] + list(self.c) + [0]
        self.u = [0] + list(self.u) + [0]
        self.A = sp.diags([self.l[1:], self.c, self.u[:-1]], [-1, 0, 1], format='csc')

    def _set_matrix_simplify(self):
        self.dx = self._dx[:-1]
        # 舍弃第一个元素
        self.dx_shift = self._dx[1:]

        # 一阶导数系数
        self.drift = (2*self.vol**2 - self.r) * self.xvec[1:-1]
        # 一阶导数
        self.l1 = - self.dx_shift / ((self.dx+self.dx_shift)*self.dx)
        self.c1 = (self.dx_shift - self.dx) / (self.dx*self.dx_shift)
        self.u1 = self.dx / ((self.dx+self.dx_shift)*self.dx_shift)

        # 二阶导数系数
        self.diffusion = 0.5 * (self.xvec[1:-1] * self.vol)**2
        # 二阶导数
        self.l2 = 2 / ((self.dx+self.dx_shift)*self.dx)
        self.c2 = -2 / (self.dx*self.dx_shift)
        self.u2 = 2 / ((self.dx+self.dx_shift)*self.dx_shift)

        # 构建系数矩阵
        self.l =[0] + list(self.drift*self.l1 + self.diffusion*self.l2) + [0]
        self.c = [0] + list(self.drift*self.c1 + self.diffusion*self.c2 + self.vol**2 - self.r) + [0]
        self.u = [0] + list(self.drift*self.u1 + self.diffusion*self.u2) + [0]
        self.A = sp.diags([self.l[1:], self.c, self.u[:-1]], [-1, 0, 1], format='csc')

    def analytical(self, time):
        coefficient = 1 / self.xvec / self.vol / np.sqrt(2 * np.pi * time)
        _exp = -(np.log(self.xvec/self.x0) - (self.r-0.5*self.vol**2) * time) ** 2 / (2 * self.vol ** 2 * time)
        return coefficient * np.exp(_exp)


if __name__ == '__main__':
    import matplotlib.pyplot as plt
    sb = SnowballDiscrete(0.03, 0.13, 200, 8, 100, 1.03, 0.8)
    sb.xvec = np.linspace(45.069054980931064, 235.60213215933192, 200)
    for t in np.arange(1/12, 1+1/12, 1/12):
        rsu = sb.analytical(t)
        plt.plot(sb.xvec, rsu, label=t)
    plt.title('Analytical')
    plt.legend()
    plt.show()
