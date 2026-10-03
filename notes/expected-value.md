# 期望

$$
\text{离散：}\quad E[X]=\sum_{i=1}^{n}x_i\,f(x_i)\qquad\qquad \text{连续：}\quad E[X]=\int_{-\infty}^{+\infty}x\,f(x)\,dx
$$

推广到 $X$ 的函数 $g(X)$：

$$
E[g(X)]=\sum_{i=1}^{n}g(x_i)\,f(x_i)\qquad\qquad E[g(X)]=\int_{-\infty}^{+\infty}g(x)\,f(x)\,dx
$$

期望要用到[[random-variable|随机变量]]的分布 $f$。上面第二组公式里取 $g(x)=(x-E[X])^2$，算出来的就是[[variance|方差]]；所以方差是一种特殊的期望。
