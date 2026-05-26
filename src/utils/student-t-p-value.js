// Two-tailed p-value for Student's t-distribution.
// Computed via the regularized incomplete beta function I_x(df/2, 1/2),
// which equals 2 * (1 - cdf(|t|, df)) exactly. Continued-fraction expansion
// follows Numerical Recipes (Press et al., 6.4); log-gamma uses Lanczos g=7.

const LANCZOS_G = 7
const LANCZOS_P = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
]

const log_gamma = (z) => {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - log_gamma(1 - z)
  }
  z -= 1
  let x = LANCZOS_P[0]
  for (let i = 1; i < 9; i++) x += LANCZOS_P[i] / (z + i)
  const t = z + LANCZOS_G + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

const betacf = (a, b, x) => {
  const MAX_ITER = 200
  const EPS = 3e-10
  const FPMIN = 1e-30
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

const regularized_incomplete_beta = (a, b, x) => {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    log_gamma(a + b) -
      log_gamma(a) -
      log_gamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  )
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

export const student_t_two_tailed_p_value = (t, df) => {
  if (!isFinite(t) || !isFinite(df) || df <= 0) return NaN
  if (t === 0) return 1
  const x = df / (df + t * t)
  return regularized_incomplete_beta(df / 2, 0.5, x)
}
