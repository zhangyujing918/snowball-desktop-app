# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月27日

"""
import numpy as np
import scipy.sparse as sp
import scipy.linalg as sl


class OldDiscreteSpaceSolution:
    """
        三点中心差分
    """
    def __init__(self, k, x_min, x_max, Nx, t):
        self.x_min = x_min
        self.x_max = x_max
        self.Nx = Nx
        self.t = t
        self.dx = (self.x_max - self.x_min) / self.Nx
        self.alpha = 0.5 * k ** 2 / self.dx / self.dx
        self.xvec = np.linspace(self.x_min, self.x_max, self.Nx + 1)
        self.D = None
        self.expDt = None
        self.Q = None
        self.Q_inv = None

    def _set_initial_condition(self):
        self.u0 = 1 - np.abs(self.xvec)

    def _set_matrix(self):
        self.l = np.array([0] + [1] * (self.Nx - 1) + [0])
        self.c = np.array([0] + [-2] * (self.Nx - 1) + [0])
        self.u = np.array([0] + [1] * (self.Nx - 1) + [0])
        self.A = sp.diags([self.l[1:], self.c, self.u[:-1]], [-1, 0, 1], format='csc')
        self.A *= self.alpha

    def _eigen_value_vector(self):
        self.values, self.vectors = sl.eig(self.A.toarray())

    def solve(self):
        self._set_initial_condition()
        self._set_matrix()
        self._eigen_value_vector()
        self.D = sp.diags(self.values)
        self.expDt = sp.linalg.expm(self.D.toarray() * self.t)

        self.Q = self.vectors
        self.Q_inv = sl.inv(self.Q)

        ut = self.Q @ self.expDt @ self.Q_inv @ self.u0
        return ut


if __name__ == '__main__':
    k = np.sqrt(0.02)
    x_min = -1
    x_max = 1
    Nx = 4
    t = 10
    DSS = OldDiscreteSpaceSolution(k, x_min, x_max, Nx, t)
    ut = DSS.solve()
    print(np.real(ut))
    # print(DSS.values)
