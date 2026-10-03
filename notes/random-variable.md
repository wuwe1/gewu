# 随机变量和它的分布

随机变量 $X$：把样本空间里的每个结果，对应到实数轴上的一个函数。

**累积分布函数（CDF）**：单调不减，$\lim_{x\to-\infty}F(x)=0$，$\lim_{x\to+\infty}F(x)=1$，

$$
F(x)=P(X\leqslant x)
$$

**概率密度（PDF）**和它与 CDF 的关系：

$$
\text{离散：}\quad f(x_j)=P(X=x_j),\qquad F(x)=\sum_{x_i\leqslant x}P(X=x_i)
$$

$$
\text{连续：}\quad F(x)=\int_{-\infty}^{x}f(y)\,dy,\qquad f(x)=\frac{dF}{dx}
$$

- 连到：[[expected-value]]、[[variance]]、[[statistical-inference]]
