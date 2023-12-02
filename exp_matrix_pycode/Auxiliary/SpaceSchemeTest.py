# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月01日

"""
import sympy as sp


def compute_finite_diff_coeffs(n, dx=sp.Rational(1)):
    """ Compute the finite difference coefficients for the second derivative using a stencil of size n.
        The method is same as FinDiff, but offset is only [..., -2h, -h, 0, h, 2h, ...], in fact, we need
        different offsets to calculate the second derivative, especially, when the row is filled.
        So we need to switch to FinDiff.
    """
    if n % 2 == 0:
        raise ValueError("n should be odd.")

    # Number of terms on one side of the central point
    half_n = n // 2

    # Construct the matrix and vector
    b = []
    rows = []

    # Construct the rows based on the Taylor series expansion
    for order in range(n):
        b.append(1/dx/dx) if order == 2 else b.append(0)
        row = [(i ** order) / sp.factorial(order) for i in range(-half_n, half_n + 1)]
        rows.append(row)

    # Convert rows to a matrix
    M = sp.Matrix(rows)

    # Solve the linear system
    coeffs = M.LUsolve(sp.Matrix(b))

    return coeffs
