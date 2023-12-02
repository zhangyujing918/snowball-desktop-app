# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月18日

"""
import numpy as np
from Auxiliary.NonUniformGrid import plot_grid
from MatrixExponential.SnowballMatrixApproximation import SnowballMatrixApproximation, PDF
import pandas as pd
import matplotlib.pyplot as plt

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

        print()
        print("敲出观察日", self.sma.out_observe_day)
        print("增量敲出概率", self.adj_incre_out_proba)

        # 价格加总
        # self.out_price = self.discount @ (self.adj_incre_out_proba * (self.sma.out_observe_day * self.out_coupon))

        # 看每个敲出观察日价格
        self.out_price = self.discount * (self.adj_incre_out_proba * (self.sma.out_observe_day * self.out_coupon))
        print("敲出部分价格", self.out_price * self.sma.x0)
        print("敲出部分价格之和", np.sum(self.out_price * self.sma.x0))
        print()

        self.dnt_price = self.discount[-1] * self.sma.dnt_proba * (self.sma.t*self.dividend_coupon)
        self.in_price = [-(self.sma.x0-x)/self.sma.x0 if x<self.sma.x0 else 0 for x in self.sma.xvec]
        self.in_price = (self.discount[-1] * self.sma.integrate(self.in_price*self.sma.KI.u0, self.sma.xvec,
                                                                self.sma.total_dx, 'simps'))
        self.total_price = self.out_price + self.in_price + self.dnt_price
        self.out_price *= self.notional
        self.in_price *= self.notional
        self.dnt_price *= self.notional
        self.total_price *= self.notional
        print(f'敲出部分的价值为：{self.out_price}')
        print(f'敲入部分的价值为：{self.in_price}')
        print(f'不敲出不敲入部分的价值为：{self.dnt_price}')
        print(f'雪球的价值为：{self.total_price}')


if __name__ == '__main__':
    r = 0.03
    vol = 0.13
    Nx = 200
    Nt = 330
    x0 = 100
    start_date = 0
    expiry_date = 1
    t = expiry_date - start_date
    up = 1.03
    down = 0.85
    out_coupon = 0.2
    dividend_coupon = 0.2
    notional = 100
    sma = SnowballMatrixApproximation(r=r, vol=vol, Nx=Nx, t=t, x0=x0, up=up, down=down, Nt=Nt,
                                      OUT=PDF(), KI=PDF(), DNT=PDF(), num_eigenvalue=None,
                                      integrate_method='inner_product', is_changed_grid=True,
                                      is_uniform=True, is_simplify=False)
    sma.get_proba()
    sn = Snowball(r=r, out_coupon=out_coupon, dividend_coupon=dividend_coupon, notional=notional, sma=sma)
    sn.get_price()
    plot_grid(sma.xvec, sma.total_dx, sma.down, sma.up, sma.dense_range, sma.Nx, x0)
    # data_list = []
    # for pdf in [sma.OUT, sma.KI, sma.DNT]:
    #     data = pd.DataFrame()
    #     data.index = sma.tvec
    #     for _time in sma.tvec:
    #         data.loc[_time, 'proba'] = pdf.ut_dict[_time] @ sma.dx_dict[_time]
    #     data_list.append(data)
    # (data_list[0] + data_list[1] + data_list[2]).plot()
    # plt.show()