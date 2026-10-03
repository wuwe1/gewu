# 切比雪夫不等式

$X$ 的期望是 $\mu$、标准差是 $\sigma$，对任意 $k>0$：

$$
P\big(|X-\mu|\geqslant k\sigma\big)\leqslant\frac{1}{k^2}
$$

它只用到[[expected-value|期望]] $\mu$ 和[[variance|标准差]] $\sigma$，不管分布长什么样，所以上限很宽松，但哪里都能用。用在样本平均上（平均的方差是 $\sigma^2/n$），就推出[[law-of-large-numbers|大数定律]]。
