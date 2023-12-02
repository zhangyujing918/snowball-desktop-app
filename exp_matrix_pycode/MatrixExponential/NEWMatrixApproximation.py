# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月28日

"""
import findiff
import numpy as np
import scipy.sparse as sp
import scipy.linalg as sl
from AnalyticalMethod.NEWDiscreteSpaceSolution import NewDiscreteSpaceSolution


class NewMatrixApproximation(NewDiscreteSpaceSolution):
    """
    引入 Residual 项获取全空间。
    """

    def __init__(self, k, x_min, x_max, Nx, t, number_of_eigenvalue):
        super().__init__(k, x_min, x_max, Nx, t)
        self.number_of_eigenvalue = number_of_eigenvalue
        self.coefficient = None
        self.result_coefficient = None
        self.approximate = None
        self.b = None

    def _eigen_value_vector(self):
        self.values, self.vectors = sp.linalg.eigs(self.A,
                                                   self.number_of_eigenvalue,
                                                   which='SM')  # sparse matrix

    def _get_matrix(self):
        V_block = self.vectors
        I_block = np.eye(self.vectors.shape[0])
        Zero_block = np.zeros((self.vectors.shape[1], self.vectors.shape[1]))
        Vt_block = self.vectors.T
        self.matrix = np.block([[V_block, I_block], [Zero_block, Vt_block]])

    def _get_coefficient(self):
        self.b = np.array(list(self.u0) + [0] * self.vectors.shape[1])
        self.coefficient = np.linalg.solve(self.matrix, self.b)

    def solve(self):
        self._set_initial_condition()
        self._get_offset_list()
        self._set_matrix()
        self._eigen_value_vector()
        self._get_matrix()
        self._get_coefficient()
        self.result_coefficient = self.coefficient[:self.values.shape[0]] * np.exp(np.real(self.values) * self.t)
        self.approximate = np.sum(self.result_coefficient[:, np.newaxis] * self.vectors.T, axis=0)
        ut = self.approximate

        return ut

    def update_and_solve(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self._set_initial_condition()
        self._eigen_value_vector()
        self._get_matrix()
        self._get_coefficient()
        self.result_coefficient = self.coefficient[:self.values.shape[0]] * np.exp(np.real(self.values) * self.t)
        self.approximate = np.sum(self.result_coefficient[:, np.newaxis] * self.vectors.T, axis=0)
        ut = self.approximate

        return ut



if __name__ == '__main__':
    import numpy as np

    k = np.sqrt(0.02)
    x_min = -1
    x_max = 1
    Nx = 16
    t = 10
    number_of_eigenvalue = 10
    MatrixAppro = NewMatrixApproximation(k, x_min, x_max, Nx, t, number_of_eigenvalue)
    ut = MatrixAppro.solve()
    print('OLD: \n', np.real(ut))
    dict1 = {'Nx':20, 'number_of_eigenvalues':5}
    ut = MatrixAppro.update_and_solve(**dict1)
    print('NEW: \n', np.real(ut))
