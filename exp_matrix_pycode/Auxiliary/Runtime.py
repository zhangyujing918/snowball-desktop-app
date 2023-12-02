# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年10月26日

"""
import time

def runtime(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        # print(f"'{func.__name__}' function took {end_time - start_time:.2f} seconds to run.")
        return end_time - start_time, result
    wrapper._original = func  # 保存原始函数的引用
    return wrapper