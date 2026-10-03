# 地图：从有限、带噪声的数据，做可靠的判断

**为了解释什么**：手里只有一些观察（一次评测、一批抽检、一段收益记录），怎么判断背后的真实情况；这个数字有多可信；要多少数据才够；什么时候会被运气骗。

参考（查公式用）：[CME 106 概率速查表](https://stanford.edu/~shervine/teaching/cme-106/cheatsheet-probability/)、[CME 106 统计速查表](https://stanford.edu/~shervine/teaching/cme-106/cheatsheet-statistics/)。

每个节点：**定义**（它是什么）· **推导**（为什么是这样）· **直觉**（一句话的画面）· **解释**（它回答哪类问题）。`[[名字]]` 是对应的原子笔记，`notes/<名字>.md`。

## 1 一次随机的结果，怎么描述？——概率模型

- [[probability-axioms]] 概率的三条公理
  - 定义：$0\leqslant P(E)\leqslant 1$；$P(S)=1$；互斥事件的概率可以相加
  - 解释：后面所有的 $P$ 都从这里来
- [[random-variable]] 随机变量和分布
  - 定义：把随机的结果对应成数；分布告诉每个数出现的概率
  - 解释：把「输赢」「次品」「支持不支持」都变成可以计算的 0/1
- [[expected-value]] 期望
  - 定义：$E[X]=\sum_x x\,P(X=x)$，按概率加权的平均
  - 推导：线性 $E[aX+bY]=aE[X]+bE[Y]$（不需要独立）
  - 直觉：做很多次，平均下来每次得到多少
  - 解释：公平价格、盈亏平衡（价格 = 概率 × 赔付）
- [[variance]] 方差和标准差
  - 定义：$\operatorname{Var}(X)=E[(X-\mu)^2]$；标准差 $\sigma=\sqrt{\operatorname{Var}(X)}$
  - 推导：$\operatorname{Var}(X)=E[X^2]-\mu^2$；0/1 变量的方差 $q(1-q)$
  - 直觉：离平均值典型地有多远
  - 解释：一个结果「不稳定」到什么程度
- [[independence]] 独立
  - 定义：$P(A\cap B)=P(A)\,P(B)$
  - 推导：独立 ⇒ [[covariance]] 为 0 ⇒ $\operatorname{Var}(X+Y)=\operatorname{Var}(X)+\operatorname{Var}(Y)$
  - 直觉：两个偏差有时同向、有时反向，平均下来互相抵消一部分
  - 解释：为什么方差能相加、标准差不能

## 2 很多次加起来、平均下来，会怎样？——极限定理

- [[sum-and-mean-of-iid]] 和与平均的期望、方差
  - 定义：$n$ 个独立同分布的 $X_i$，和 $S=\sum X_i$，平均 $\bar X=S/n$
  - 推导：$E[S]=n\mu$，$\operatorname{Var}(S)=n\sigma^2$ ⇒ $\operatorname{SD}(S)=\sqrt{n}\,\sigma$；$\operatorname{SD}(\bar X)=\sigma/\sqrt{n}$
  - 直觉：总量按 $n$ 长，波动按 $\sqrt{n}$ 长
  - 解释：数据越多越准，但准一倍要四倍的数据
- [[binomial]] 伯努利和二项分布
  - 定义：一次 0/1（概率 $q$）；$n$ 次里出现几次 1
  - 推导：均值 $nq$，方差 $nq(1-q)$（由上一条直接得到）；$P(k)=\binom{n}{k}q^k(1-q)^{n-k}$（数路径）
  - 解释：胜率、次品率、通过率、支持率
- [[law-of-large-numbers]] 大数定律
  - 定义：$n$ 越大，$\bar X$ 越接近 $\mu$
  - 推导：[[chebyshev-inequality]] 用在 $\bar X$ 上：$P(|\bar X-\mu|\geq\varepsilon)\leq\dfrac{\sigma^2}{n\varepsilon^2}\to 0$
  - 解释：为什么频率能当概率用
- [[central-limit-theorem]] 中心极限定理
  - 定义：$\dfrac{S-n\mu}{\sqrt{n}\,\sigma}$ 的分布趋向标准正态，不管 $X_i$ 原来长什么样
  - 推导：二项的情形用斯特林公式（棣莫弗-拉普拉斯）；一般情形用特征函数，展开到二阶
  - 直觉：凑出「中间」结果的路最多；加多了，原来的形状被抹平
  - 解释：为什么到处是钟形；±2σ ≈ 95% 为什么到处能用
- [[normal-distribution]] 正态分布
  - 定义：标准正态密度 $\dfrac{1}{\sqrt{2\pi}}e^{-z^2/2}$
  - 解释：68–95–99.7；把「几个标准差」换算成「多罕见」

## 3 只看到一份样本，真实值可能在哪？——估计

- [[standard-error]] 估计量和标准误
  - 定义：用样本算出来猜真实值的量（例 $\hat p$）；标准误 = 它的标准差
  - 推导：$\hat p=S/n$ ⇒ $SE=\sqrt{p(1-p)/n}$
  - 解释：一次调查、一次评测的数字自带多大误差
- [[confidence-interval]] 置信区间
  - 定义：$\hat p\pm z\cdot SE$
  - 推导：$P(|\hat p-p|\leq 1.96\,SE)\approx 95\%$，把不等式倒过来解 $p$
  - 直觉：95% 是这套做法的长期命中率，不是这一个区间的概率
  - 解释：民调的「±3%」；评测分数的误差棒

## 4 一个差别，是真的还是运气？——假设检验

- [[hypothesis-test]] 零假设、检验统计量、p 值
  - 定义：先假设「没有差别」，算 $z=\dfrac{\text{观察}-\text{假设值}}{SE}$；p 值 = 假设成立时看到这么极端结果的概率
  - 解释：「模型降智了吗」「这个策略有用吗」
- [[two-types-of-error]] 两类错误和功效
  - 定义：α = 没变却报警；β = 变了却没发现；功效 = 1 − β
  - 推导：判定线离 $H_0$ 中心 $z_\alpha SE_0$、离 $H_1$ 中心 $z_\beta SE_1$ ⇒ 需要 $\Delta\geq z_\alpha SE_0+z_\beta SE_1$ ⇒ 解出 $n$
  - 直觉：两座山的重叠；只能靠多要数据让山变瘦
  - 解释：要多少样本才测得出来；「没测出差别」不等于「没有差别」
- [[two-proportions]] 两个比例之差
  - 推导：$\operatorname{Var}(\hat p_1-\hat p_2)=\operatorname{Var}(\hat p_1)+\operatorname{Var}(\hat p_2)$（独立）
  - 解释：A 和 B 哪个更好（两个模型、两种做法）
- [[experiment-design]] 对照组、配对、随机化
  - 解释：把「真的变了」和「别的东西变了」分开

## 5 试了很多次，怎么不被骗？——多重比较

- [[multiple-comparisons]] 多重比较
  - 推导：$m$ 个独立检验，至少一个假阳性 $=1-(1-\alpha)^m$；Bonferroni：$P(\cup A_i)\leq\sum P(A_i)$ ⇒ 每个用 $\alpha/m$
  - 解释：回测出的「好策略」、只汇报最显著的结果
- [[survivorship-bias]] 幸存者偏差
  - 解释：你只看得到活下来的（暴富故事、连胜的预言家）
- [[preregistration]] 事先登记、样本外复现
  - 解释：怎么设计，才不给运气留机会

## 6 用概率做决定——决策

- [[break-even]] 期望值决策、盈亏平衡
  - 推导：期望收益 $p-c=0$ ⇒ 盈亏平衡胜率 = 全部成本 / 赔付
  - 解释：99c 合约、手续费为什么致命
- [[calibration]] 校准
  - 定义：说 70% 的事，长期真的有 70% 发生
  - 解释：预测市场的价格、模型的「置信度」能不能信
- [[proper-scoring-rule]] 适当评分规则
  - 定义：例 Brier 分数 $(r-y)^2$
  - 推导：$E[(r-Y)^2]=(r-p)^2+p(1-p)$，在 $r=p$ 时最小
  - 直觉：老实报你心里的概率，得分最高
  - 解释：怎么训练、怎么考核一个「报概率的人或模型」

## 以后（碰到再学）

- 回归：两个量有什么关系（OpenIntro 第 8 章）→ 利率和股价
- 贝叶斯：有先验时怎么更新判断
