# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月28日

OLDMatrixApproximation
--------------------------

Description:
This module is used to approximate how to use the eigensubspace of a matrix.

Version History:
1.0.0 - 2023-10-28
    - Codebase implementation, Inherited from the `OLDDiscreteSpaceSolution` class.
1.0.1 - 2023-11-1
    - The eigenvalue with the largest absolute value is calculated to the eigenvalue
      with the smallest absolute value.
    - Add the `update_and_solve` function to avoid re-evaluating matrix A, which takes
      more time in some differential schemes.
"""
import numpy as np
import scipy.sparse as sp
import scipy.linalg as sl
from AnalyticalMethod.OLDDiscreteSpaceSolution import OldDiscreteSpaceSolution


class OldMatrixApproximation(OldDiscreteSpaceSolution):

    def __init__(self, k, x_min, x_max, Nx, t, num_eigenvalue):
        super().__init__(k, x_min, x_max, Nx, t)
        self.number_of_eigenvalue = num_eigenvalue

    def _eigen_value_vector(self):
        self.values, self.vectors = sp.linalg.eigs(self.A,
                                                   self.number_of_eigenvalue,
                                                   which='SM')  # The absolute value is minimal

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
    import matplotlib.pyplot as plt

    k = np.sqrt(0.02)
    x_min = -1
    x_max = 1
    Nx = 100
    t = 10
    number_of_eigenvalue = 50
    MatrixAppro = OldMatrixApproximation(k, x_min, x_max, Nx, t, number_of_eigenvalue)
    ut = MatrixAppro.solve()


    # -------------------- eigenvalue eigenvector test --------------------
    # idx = np.argsort(np.abs(MatrixAppro.values))
    # s_var = np.real(MatrixAppro.values[idx])
    # s_vec = np.real(MatrixAppro.vectors[:, idx]).T
    # coefs = np.real(MatrixAppro.coefficient)[idx]
    # coe = coefs[:MatrixAppro.values.shape[0]]
    # vec0 = coe[0] * s_vec[0] + coe[0] * s_vec[0]
    # print('系数：', coe[:5])
    # print('特征值：', s_var[:5])
    # # print('特征值为0的特征向量：', vec0)
    # plt.plot(MatrixAppro.xvec, s_vec[0])
    # plt.plot(MatrixAppro.xvec, s_vec[1])
    # plt.show()

    # -------------------- update_and_solve test --------------------
    def detect_changes(obj, method_name, **kwargs):
        # 1. 存储执行前的属性
        before_attrs = vars(obj).copy()

        # 2. 执行方法
        getattr(obj, method_name)(**kwargs)  # obj.method_name()

        # 3. 存储执行后的属性
        after_attrs = vars(obj)

        # 4. 比较属性
        changed_attrs = {k: (before_attrs[k], after_attrs[k])
                         for k in before_attrs
                         if not np.array_equal(before_attrs[k], after_attrs[k])}
        return changed_attrs

    dict1 = {'num_eigenvalue':50}
    MatrixAppro.update_and_solve(**dict1)
    changed_attrs = detect_changes(MatrixAppro, 'update_and_solve', **dict1)
    print(changed_attrs)
