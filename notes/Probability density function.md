The probability density function $f$ is the probability that $X$ takes on values between two adjacent realizations of the [[Random variable|random variable]].

**Discrete case** ― Here, $X$ takes discrete values, such as outcomes of coin flips. By noting $f$ and $F$ the PDF and [[Cumulative distribution function|CDF]] respectively, we have the following relations:

$$
F(x)=\sum_{x_i\leqslant x}P(X=x_i)\quad\textrm{and}\quad f(x_j)=P(X=x_j)
$$

On top of that, the PDF is such that:

$$
0\leqslant f(x_j)\leqslant1\quad\textrm{and}\quad\sum_{j}f(x_j)=1
$$

**Continuous case** ― Here, $X$ takes continuous values, such as the temperature in the room. By noting $f$ and $F$ the PDF and [[Cumulative distribution function|CDF]] respectively, we have the following relations:

$$
F(x)=\int_{-\infty}^xf(y)dy\quad\textrm{and}\quad f(x)=\frac{dF}{dx}
$$

On top of that, the PDF is such that:

$$
f(x)\geqslant0\quad\textrm{and}\quad\int_{-\infty}^{+\infty}f(x)dx=1
$$
