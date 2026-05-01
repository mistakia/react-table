/**
 * Pure data-transformation helper for the diagonal iso-value tier grid overlay.
 * Computes x + y = k lines at quintile cut points of {x_i + y_i}.
 *
 * No Highcharts import — keeps this unit-testable in isolation.
 */

/**
 * Compute a quantile value from a sorted numeric array.
 * @param {number[]} sorted - ascending-sorted array
 * @param {number} p - percentile in [0, 1]
 * @returns {number}
 */
const quantile = (sorted, p) => {
  if (sorted.length === 0) return NaN
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const frac = idx - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

/**
 * Build an array of Highcharts line-series configs for iso-value (x+y=k) diagonal lines
 * at the quintile cut points of {x_i + y_i}.
 *
 * @param {object} params
 * @param {number[]} params.x_values - array of x data values
 * @param {number[]} params.y_values - array of y data values (parallel to x_values)
 * @returns {object[]} array of Highcharts series config objects (0–4 items)
 */
const build_tier_series = ({ x_values, y_values }) => {
  if (
    !Array.isArray(x_values) ||
    !Array.isArray(y_values) ||
    x_values.length === 0 ||
    y_values.length === 0
  ) {
    return []
  }

  // Pair-wise filter: both x and y must be valid finite numbers
  const sums = []
  const valid_x = []
  const valid_y = []
  for (let i = 0; i < Math.min(x_values.length, y_values.length); i++) {
    const x = x_values[i]
    const y = y_values[i]
    if (
      x == null ||
      y == null ||
      !isFinite(x) ||
      !isFinite(y) ||
      isNaN(x) ||
      isNaN(y)
    ) {
      continue
    }
    sums.push(x + y)
    valid_x.push(x)
    valid_y.push(y)
  }

  if (sums.length < 2) return []

  const sorted_sums = [...sums].sort((a, b) => a - b)
  const percentiles = [0.2, 0.4, 0.6, 0.8]
  const k_values = percentiles.map((p) => quantile(sorted_sums, p))

  // Deduplicate k_values (degenerate case: all sums identical)
  const unique_k = [...new Set(k_values.map((k) => Math.round(k * 1e9) / 1e9))]

  const x_min = Math.min(...valid_x)
  const x_max = Math.max(...valid_x)
  const y_min = Math.min(...valid_y)
  const y_max = Math.max(...valid_y)

  // Clip each iso-value line (y = k - x, slope -1) to the data's bounding box
  // so tier lines never extend outside the data extent and force the chart to
  // expand its axes to fit them.
  const series = []
  unique_k.forEach((k, i) => {
    let sx = x_min
    let sy = k - x_min
    let ex = x_max
    let ey = k - x_max

    if (sy > y_max) {
      sy = y_max
      sx = k - y_max
    }
    if (sy < y_min) return
    if (ey < y_min) {
      ey = y_min
      ex = k - y_min
    }
    if (ey > y_max) return
    if (sx >= ex) return

    series.push({
      type: 'line',
      name: `Tier ${i + 1}`,
      data: [
        [sx, sy],
        [ex, ey]
      ],
      dashStyle: 'Dot',
      color: 'rgba(120,120,120,0.4)',
      enableMouseTracking: false,
      marker: { enabled: false },
      showInLegend: false,
      includeInDataExport: false,
      accessibility: { enabled: false }
    })
  })

  return series
}

export { build_tier_series }
