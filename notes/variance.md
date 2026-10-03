# 方差和标准差

$$
\operatorname{Var}(X)=E\big[(X-E[X])^2\big]=E[X^2]-E[X]^2
$$

标准差：

$$
\sigma=\sqrt{\operatorname{Var}(X)}
$$

方差是一种[[expected-value|期望]]：$E[g(X)]$ 取 $g(x)=(x-E[X])^2$。它也是[[covariance|协方差]]的特例：$\operatorname{Var}(X)=\operatorname{Cov}(X,X)$。[[chebyshev-inequality|切比雪夫不等式]]用标准差 $\sigma$ 给出「离期望很远」的概率上限。
