import numpy as np
import matplotlib.pyplot as plt

# 1. 基础设置与 Sigmoid 定义
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# 提高饱和度的配色方案
color_low = '#00A087FF'
color_high = '#E74C3C'  # 高饱和珊瑚红 (分值较高部分)
color_line = '#7F8C8D'  # 深灰色 (用于虚线，提高对比度)

x = np.linspace(-6, 6, 1000)
y = sigmoid(x)

# 定义交点 (阈值)
target_x = 0
target_y = sigmoid(target_x)

# 2. 绘图初始化
fig, ax = plt.subplots(figsize=(8, 5))

# 3. 绘制 Sigmoid 曲线 (设置 zorder=1，使其在最底层)
# 交点以下的部分
ax.plot(x[x <= target_x], y[x <= target_x], color=color_low, linewidth=5, zorder=1)
# 交点以上的部分
ax.plot(x[x >= target_x], y[x >= target_x], color=color_high, linewidth=5, zorder=1)

# 4. 绘制精准止步的虚线 (zorder=2)
# 横轴虚线：从纵轴(x=-6.5)到交点(target_x)停止
ax.hlines(y=target_y, xmin=-6.5, xmax=10, color=color_line, 
          linestyle='--', linewidth=2, zorder=2)
# 纵轴虚线：从横轴(y=0)到交点(target_y)停止
ax.vlines(x=target_x, ymin=0, ymax=10, color=color_line, 
          linestyle='--', linewidth=2, zorder=2)

# 5. 绘制带箭头的坐标轴 (zorder=3，确保在曲线和虚线之上)
ax.axis('off')

# 手动绘制 X 轴箭头
ax.annotate('', xy=(7, 0), xytext=(-7, 0),
            arrowprops=dict(arrowstyle="->", color='black', lw=4, zorder=3))
# 手动绘制 Y 轴箭头
ax.annotate('', xy=(-6.5, 1.2), xytext=(-6.5, 0),
            arrowprops=dict(arrowstyle="->", color='black', lw=4, zorder=3))

# 6. 设置范围
ax.set_xlim(-7.5, 7.5)
ax.set_ylim(-0.1, 1.3)

plt.tight_layout()
plt.show()