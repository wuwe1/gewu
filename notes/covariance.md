# 协方差和相关系数

$$
\operatorname{Cov}(X,Y)\triangleq\sigma_{XY}^2=E\big[(X-\mu_X)(Y-\mu_Y)\big]=E[XY]-\mu_X\mu_Y
$$

相关系数：

$$
\rho_{XY}=\frac{\sigma_{XY}^2}{\sigma_X\,\sigma_Y}
$$

- 对任意 $X$、$Y$，$\rho_{XY}\in[-1,1]$
- 如果 $X$、$Y$ 独立，那么 $\rho_{XY}=0$

$\operatorname{Cov}(X,X)=\operatorname{Var}(X)$：[[variance|方差]]是协方差的特例。[[independence|独立]]的两个变量协方差为 0。相关系数把协方差除以两个标准差，去掉了单位，所以总在 $[-1,1]$ 里。
