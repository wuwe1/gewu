A confidence interval $CI_{1-\alpha}$ with [[Confidence level|confidence level]] $1-\alpha$ of a true parameter $\theta$ is such that:

$$
P(\theta\in CI_{1-\alpha})=1-\alpha
$$

![[confidence-interval.svg|633]]

With the notation of the example above, a possible $1-\alpha$ confidence interval for $\theta$ is given by $CI_{1-\alpha} = [x_1, x_2]$.

When determining a confidence interval for the mean $\mu$, different test statistics have to be computed depending on which case we are in. The table below sums it up.

| Distribution of $X_i$ | Sample size $n$ | Variance $\sigma^2$ | Statistic | $1-\alpha$ confidence interval |
|---|---|---|---|---|
| $X_i\sim\mathcal{N}(\mu, \sigma)$ | any | known | $\displaystyle\frac{\overline{X}-\mu}{\frac{\sigma}{\sqrt{n}}}\sim\mathcal{N}(0,1)$ | $\left[\overline{X}-z_{\frac{\alpha}{2}}\frac{\sigma}{\sqrt{n}},\overline{X}+z_{\frac{\alpha}{2}}\frac{\sigma}{\sqrt{n}}\right]$ |
| $X_i\sim$ any distribution | large | known | $\displaystyle\frac{\overline{X}-\mu}{\frac{\sigma}{\sqrt{n}}}\sim\mathcal{N}(0,1)$ | $\left[\overline{X}-z_{\frac{\alpha}{2}}\frac{\sigma}{\sqrt{n}},\overline{X}+z_{\frac{\alpha}{2}}\frac{\sigma}{\sqrt{n}}\right]$ |
| $X_i\sim$ any distribution | large | unknown | $\displaystyle\frac{\overline{X}-\mu}{\frac{s}{\sqrt{n}}}\sim\mathcal{N}(0,1)$ | $\left[\overline{X}-z_{\frac{\alpha}{2}}\frac{s}{\sqrt{n}},\overline{X}+z_{\frac{\alpha}{2}}\frac{s}{\sqrt{n}}\right]$ |
| $X_i\sim\mathcal{N}(\mu, \sigma)$ | small | unknown | $\displaystyle\frac{\overline{X}-\mu}{\frac{s}{\sqrt{n}}}\sim t_{n-1}$ | $\left[\overline{X}-t_{\frac{\alpha}{2}}\frac{s}{\sqrt{n}},\overline{X}+t_{\frac{\alpha}{2}}\frac{s}{\sqrt{n}}\right]$ |
| $X_i\sim$ any distribution | small | known or unknown | Go home! | Go home! |

The single-line table below sums up the test statistic to compute when determining the confidence interval for the variance.

| Distribution of $X_i$ | Sample size $n$ | Mean $\mu$ | Statistic | $1-\alpha$ confidence interval |
|---|---|---|---|---|
| $X_i\sim\mathcal{N}(\mu,\sigma)$ | any | known or unknown | $\displaystyle\frac{s^2(n-1)}{\sigma^2}\sim\chi_{n-1}^2$ | $\left[\frac{s^2(n-1)}{\chi_2^2},\frac{s^2(n-1)}{\chi_1^2}\right]$ |
