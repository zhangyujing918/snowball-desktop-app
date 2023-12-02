# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月27日

"""
import findiff
import numpy as np
import scipy.sparse as sp
import scipy.linalg as sl


class NewDiscreteSpaceSolution:
    """
        多点中心差分
    """
    def __init__(self, k, x_min, x_max, Nx, t):
        if Nx % 2 != 0:
            raise ValueError(f"{Nx} is an odd number!")
        else:
            self.Nx = Nx
        self.x_min = x_min
        self.x_max = x_max
        self.t = t
        self.dx = (self.x_max - self.x_min) / self.Nx
        self.alpha = 0.5 * k ** 2 / self.dx / self.dx
        self.xvec = np.linspace(self.x_min, self.x_max, self.Nx + 1)
        self.D = None
        self.expDt = None
        self.Q = None
        self.Q_inv = None
        self.A = None

    def _set_initial_condition(self):
        self.u0 = 1 - np.abs(self.xvec)

    def _get_offset_list(self):
        self.L = []
        self.L.append(None)
        for n in range(1, self.Nx):
            if 2 * n + 1 > self.Nx + 1:
                offsets = self.L[n - 1].copy()
                offsets.pop(0)
                offsets.pop(-1)
                self.L.append(offsets)
            else:
                offsets = [-n + i for i in range(2 * n + 1)]
                self.L.append(offsets)
        self.L.append(None)

    def _set_matrix(self):
        self._A = []
        for i, offsets in enumerate(self.L):
            if offsets is None:
                self._A.append([0] * (self.Nx + 1))
                continue
            coeffs = findiff.coefficients(deriv=2, offsets=offsets, symbolic=True)['coefficients']
            if i <= self.Nx / 2:
                coeffs = coeffs + [0]*(self.Nx+1-len(coeffs))
            else:
                coeffs = [0]*(self.Nx+1-len(coeffs)) + coeffs
            self._A.append(coeffs)
        self.A = np.array(self._A.copy()).astype(np.float64) * self.alpha

    def _eigen_value_vector(self):
        self.values, self.vectors = sl.eig(self.A)

    def solve(self):
        self._set_initial_condition()
        self._get_offset_list()
        self._set_matrix()
        self._eigen_value_vector()
        self.D = sp.diags(self.values)
        self.expDt = sp.linalg.expm(self.D.toarray() * self.t)

        self.Q = self.vectors
        self.Q_inv = sl.inv(self.Q)

        ut = self.Q @ self.expDt @ self.Q_inv @ self.u0
        return ut


if __name__ == '__main__':
    import pandas as pd
    k = np.sqrt(0.02)
    x_min = -1
    x_max = 1
    Nx = 100
    t = 10
    DSS = NewDiscreteSpaceSolution(k, x_min, x_max, Nx, t)
    ut = DSS.solve()
    print(DSS.L)
    print(np.real(ut))
