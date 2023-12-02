# -*- coding:utf-8 -*-

"""
作者: xta
日期: 2023年11月20日

"""
import numpy as np
from bokeh.plotting import figure, show
from bokeh.layouts import gridplot
from bokeh.io import output_notebook
import matplotlib.pyplot as plt

def generate_custom_grid(x_min, x_max, barrier_down, barrier_up, total_points, dense_range, dense_factor=5):
    """
    Generate a custom grid with fixed intervals around barrier_down and barrier_up within a specified dense_range,
    and less dense in between the barriers.

    Parameters:
    x_min (float): The minimum value of the grid.
    x_max (float): The maximum value of the grid.
    barrier_down (float): The lower barrier where grid points will be dense.
    barrier_up (float): The upper barrier where grid points will be dense.
    total_points (int): The total number of grid points.
    dense_range (float): The range around each barrier to be densely packed.
    dense_factor (int): The factor by which the density of grid points should increase within the dense_range.

    Returns:
    numpy.ndarray: An array of grid points.
    """
    # Calculate the base intervals
    base_interval = (x_max - x_min) / (total_points - 1)
    dense_interval = base_interval / dense_factor
    regular_interval = base_interval * dense_factor

    # print(base_interval, dense_interval, regular_interval)
    if barrier_down < 0:
        dense_grid_up = np.arange(barrier_up - dense_range, barrier_up + dense_range, dense_interval)
        regular_grid_left = np.arange(x_min, barrier_up - dense_range, regular_interval)
        remain_num = total_points - dense_grid_up.shape[0] - regular_grid_left.shape[0]
        regular_grid_right = np.linspace(barrier_up+dense_range, x_max, remain_num)
        if dense_grid_up[-1] != barrier_up + dense_range:
            dense_grid_up = np.append(dense_grid_up, barrier_up + dense_range)
        if regular_grid_right[-1] != x_max:
            regular_grid_right = np.append(regular_grid_right, x_max)
        grid_points = np.concatenate(
            [regular_grid_left, dense_grid_up, regular_grid_right])

    else:
        # Generate grid points for dense and regular areas
        dense_grid_down = np.arange(barrier_down - dense_range, barrier_down + dense_range, dense_interval)
        dense_grid_up = np.arange(barrier_up - dense_range, barrier_up + dense_range, dense_interval)
        regular_grid_left = np.arange(x_min, barrier_down - dense_range, regular_interval)
        regular_grid_middle = np.arange(barrier_down + dense_range, barrier_up - dense_range, regular_interval)

        # print(dense_grid_down.shape[0], dense_grid_up.shape[0], regular_grid_left.shape[0], regular_grid_middle.shape[0])

        remain_num = total_points - dense_grid_down.shape[0] - dense_grid_up.shape[0] - regular_grid_left.shape[0] - \
                     regular_grid_middle.shape[0]
        regular_grid_right = np.linspace(barrier_up+dense_range, x_max, remain_num)

        # Add the end points if they are not included
        if dense_grid_down[-1] != barrier_down + dense_range:
            dense_grid_down = np.append(dense_grid_down, barrier_down + dense_range)
        if regular_grid_middle[-1] != barrier_up - dense_range:
            regular_grid_middle = np.append(regular_grid_middle, barrier_up - dense_range)
        if dense_grid_up[-1] != barrier_up + dense_range:
            dense_grid_up = np.append(dense_grid_up, barrier_up + dense_range)
        if regular_grid_right[-1] != x_max:
            regular_grid_right = np.append(regular_grid_right, x_max)

        # Combine grid points and remove duplicates
        grid_points = np.concatenate(
            [regular_grid_left, dense_grid_down, regular_grid_middle, dense_grid_up, regular_grid_right])
    grid_points = np.sort(grid_points)
    grid_points = np.unique(grid_points)  # Remove duplicates

    return grid_points

def in_notebook():
    try:
        from IPython import get_ipython
        if 'IPKernelApp' in get_ipython().config:
            return True
    except:
        pass
    return False

def plot_matplotlib(x_grid, intervals, barrier_down, barrier_up, dense_range, x0):
    # 创建两个子图
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 7))

    # 绘制网格点
    ax1.scatter(x_grid, [0] * len(x_grid), s=10, color="navy")
    if barrier_down > 0:
        ax1.axvspan(barrier_down - dense_range, barrier_down + dense_range, color='red', alpha=0.2,
                    label="Dense Area Near Barrier Down")
    ax1.axvspan(barrier_up - dense_range, barrier_up + dense_range, color='green', alpha=0.2,
                label="Dense Area Near Barrier Up")
    ax1.set_title(f"Grid Points | x0 = {x0}")
    ax1.set_xlabel('x')
    ax1.set_ylabel('Position')
    ax1.legend()
    ax1.grid()

    # 绘制间隔 - 线+方块
    x_grid_new = x_grid if x_grid.shape == intervals.shape else x_grid[:-1]
    ax2.plot(x_grid_new, intervals, 'navy', linestyle='--', linewidth=2, dash_capstyle='round')
    ax2.scatter(x_grid_new, intervals, color="navy", s=20, zorder=5)
    if barrier_down > 0:
        ax2.axvspan(barrier_down - dense_range, barrier_down + dense_range, color='red', alpha=0.2)
    ax2.axvspan(barrier_up - dense_range, barrier_up + dense_range, color='green', alpha=0.2)
    ax2.set_title("Intervals Between Adjacent Grid Points")
    ax2.set_xlabel('x')
    ax2.set_ylabel('Interval')
    ax2.grid()

    if barrier_down > 0:
        ax1.axvline(barrier_down, color='orange', linestyle='--', linewidth=2, label="Barrior Down")
    ax1.axvline(barrier_up, color='orange', linestyle='--', linewidth=2, label="Barrior Up")

    if barrier_down > 0:
        ax2.axvline(barrier_down, color='orange', linestyle='--', linewidth=2, label="Barrior Down")
    ax2.axvline(barrier_up, color='orange', linestyle='--', linewidth=2, label="Barrior Up")

    # Adjust layout to prevent overlap
    fig.tight_layout()
    # Show the plot
    plt.show()

def plot_grid(x_grid, intervals, barrier_down, barrier_up, dense_range, Nx, x0):
    # 根据环境选择输出方式
    if in_notebook():
        output_notebook()
        # 创建两个图形
        p1 = figure(width=970, height=250, title=f"Grid Points | x0 = {x0}", x_axis_label='x', y_axis_label='Position')
        p2 = figure(width=970, height=250, title="Intervals Between Adjacent Grid Points", x_axis_label='x',
                    y_axis_label='Interval')

        # 绘制网格点
        p1.circle(x_grid, [0] * len(x_grid), size=200/Nx, color="navy")
        if barrier_down > 0:
            p1.vbar(x=barrier_down, width=2 * dense_range, bottom=-1, top=1, color='red', fill_alpha=0.2,
                    legend_label="Dense Area Near Barrier Down")
        p1.vbar(x=barrier_up, width=2 * dense_range, bottom=-1, top=1, color='green', fill_alpha=0.2,
                legend_label="Dense Area Near Barrier Up")

        # 绘制间隔 - 线+方块
        x_grid_new = x_grid if x_grid.shape == intervals.shape else x_grid[:-1]
        p2.line(x_grid_new, intervals, line_width=2, color="navy", line_dash=[4, 4])
        p2.square(x_grid_new, intervals, size=200/Nx, color="navy")
        if barrier_down > 0:
            p2.vbar(x=barrier_down, width=2 * dense_range, bottom=0, top=max(intervals), color='red', fill_alpha=0.2)
        p2.vbar(x=barrier_up, width=2 * dense_range, bottom=0, top=max(intervals), color='green', fill_alpha=0.2)

        if barrier_down > 0:
            p1.segment(x0=[barrier_down, barrier_up], y0=[-1, -1], x1=[barrier_down, barrier_up], y1=[1, 1],
                       line_color="orange", line_width=2, line_dash='dashed')
            p2.segment(x0=[barrier_down, barrier_up], y0=[0, 0], x1=[barrier_down, barrier_up],
                       y1=[max(intervals), max(intervals)],
                       line_color="orange", line_width=2, line_dash='dashed')
        # 使用gridplot组合两个图形
        grid = gridplot([[p1], [p2]])
        # 显示图形
        show(grid)
    else:
        plot_matplotlib(x_grid, intervals, barrier_down, barrier_up, dense_range, x0)


if __name__ == '__main__':
    # Define parameters for the grid
    x_min, x_max = 78.9601475373888, 127.28098309394255
    barrier_down, barrier_up = -100, 103
    x0 = 100
    total_points = 201
    dense_range = 5
    dense_factor = 2
    Nx = 200

    # Generate the grid
    x_grid = generate_custom_grid(x_min, x_max, barrier_down, barrier_up, total_points, dense_range, dense_factor)
    # print(x_grid.shape[0])

    # Calculate intervals
    intervals = np.diff(x_grid)

    # Plotting the grid points and intervals
    plot_grid(x_grid, intervals, barrier_down, barrier_up, dense_range, Nx, x0)

