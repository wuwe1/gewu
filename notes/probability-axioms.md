# 概率的三条公理

样本空间 $S$：一次试验所有可能结果的集合。事件 $E$：$S$ 的任意子集；试验结果落在 $E$ 里，就说 $E$ 发生了。$P(E)$ 是事件 $E$ 发生的概率。

**公理 1**　任何概率都在 0 和 1 之间（含两端）：

$$
0\leqslant P(E)\leqslant 1
$$

![[probability-axiom-1.svg]]

**公理 2**　整个样本空间里至少有一个基本事件发生，概率是 1：

$$
P(S)=1
$$

**公理 3**　对任意一列两两互斥的事件 $E_1,\dots,E_n$：

$$
P\left(\bigcup_{i=1}^{n}E_i\right)=\sum_{i=1}^{n}P(E_i)
$$

后面所有的概率都是这个 $P$：[[random-variable|随机变量]]的 $P(X\leqslant x)$ 是 $P$ 用在事件「$X\leqslant x$」上；[[independence|独立]]是用 $P$ 给两个事件下的定义。
