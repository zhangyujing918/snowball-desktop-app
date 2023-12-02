# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月25日

"""
import numpy as np
import matplotlib.pyplot as plt

# Heat Equation basic information
alpha = 0.01
x = np.linspace(-1, 1, 100)

def get_bn(n):
    temp = np.pi * (2*n+1)
    frac_x = np.cos(temp/2)
    frac_y = temp**2
    bn = 8/frac_y * (1-frac_x)
    return bn


def time_func(n, t):
    temp = np.pi * (2*n+1)
    return np.exp(-alpha * (temp / 2) ** 2 * t)


def get_single_fn(n, t):
    """
    Fixing the n and t
    """
    bn = get_bn(n)
    func_t = time_func(n, t)

    def space_func(x):
        temp = np.pi * (2 * n + 1)
        return bn * func_t * np.cos(temp / 2 * x)
    return space_func


def get_fn(N, t):
    """
    Fixing the number of items
    """
    def __get_fn(x):
        f_x_t = 0
        for n in range(N):
            space_func = get_single_fn(n, t)
            f_x_t += space_func(x)
        return f_x_t
    return __get_fn


if __name__ == '__main__':
    N = 100
    t = 1000
    f_x_t = get_fn(N, t)
    plt.plot(x, f_x_t(x), label=f"t={t}")
    plt.title("Analytical")
    plt.legend()
    plt.grid(True)
    plt.show()
    print(f_x_t(x))