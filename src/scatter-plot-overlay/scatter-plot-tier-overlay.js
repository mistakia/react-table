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
 * Clip a slope-(-1) iso-value line (y = k - x) to a rectangular bounding box.
 * Returns the [[sx,sy],[ex,ey]] segment with sx < ex, or null if the line
 * does not intersect the box.
 *
 * Exposed so the chart can recompute tier endpoints against current axis
 * extremes (data bbox at load, zoom region after user-initiated zoom).
 *
 * @param {object} params
 * @param {number} params.k - line constant (x + y = k)
 * @param {number} params.x_min
 * @param {number} params.x_max
 * @param {number} params.y_min
 * @param {number} params.y_max
 * @returns {[[number,number],[number,number]] | null}
 */
const clip_tier_segment = ({ k, x_min, x_max, y_min, y_max }) => {
  if (
    !isFinite(k) ||
    !isFinite(x_min) ||
    !isFinite(x_max) ||
    !isFinite(y_min) ||
    !isFinite(y_max) ||
    x_min >= x_max ||
    y_min >= y_max
  ) {
    return null
  }

  let sx = x_min
  let sy = k - x_min
  let ex = x_max
  let ey = k - x_max

  if (sy > y_max) {
    sy = y_max
    sx = k - y_max
  }
  if (sy < y_min) return null
  if (ey < y_min) {
    ey = y_min
    ex = k - y_min
  }
  if (ey > y_max) return null
  if (sx >= ex) return null

  return [
    [sx, sy],
    [ex, ey]
  ]
}

/**
 * Compute the deduplicated quintile k values for {x_i + y_i}, plus the data
 * bounding box. Caller can use the returned k_values to (re)build segments
 * against any bounding box (e.g. current axis extremes).
 *
 * @param {object} params
 * @param {number[]} params.x_values
 * @param {number[]} params.y_values
 * @returns {{ k_values: number[], data_bounds: {x_min,x_max,y_min,y_max} | null }}
 */
const compute_tier_k_values = ({ x_values, y_values }) => {
  const empty = { k_values: [], data_bounds: null }
  if (
    !Array.isArray(x_values) ||
    !Array.isArray(y_values) ||
    x_values.length === 0 ||
    y_values.length === 0
  ) {
    return empty
  }

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

  if (sums.length < 2) return empty

  const sorted_sums = [...sums].sort((a, b) => a - b)
  const percentiles = [0.2, 0.4, 0.6, 0.8]
  const raw_k = percentiles.map((p) => quantile(sorted_sums, p))
  const k_values = [...new Set(raw_k.map((k) => Math.round(k * 1e9) / 1e9))]

  return {
    k_values,
    data_bounds: {
      x_min: Math.min(...valid_x),
      x_max: Math.max(...valid_x),
      y_min: Math.min(...valid_y),
      y_max: Math.max(...valid_y)
    }
  }
}

const TIER_SERIES_BASE = {
  type: 'line',
  dashStyle: 'ShortDash',
  color: 'rgba(60,60,60,0.7)',
  lineWidth: 1.25,
  zIndex: 5,
  enableMouseTracking: false,
  marker: { enabled: false },
  showInLegend: false,
  includeInDataExport: false,
  accessibility: { enabled: false },
  // Label only the rightmost point of each tier line with the tier name (T1…T4).
  // We compare against series.points[length-1] so the label moves with the
  // segment when refit_tier_segments_to_axes updates endpoints on zoom.
  dataLabels: {
    enabled: true,
    align: 'left',
    verticalAlign: 'middle',
    x: 4,
    y: 0,
    padding: 0,
    style: {
      color: 'rgba(60,60,60,0.85)',
      fontSize: '10px',
      fontWeight: '600',
      textOutline: 'none'
    },
    formatter: function () {
      const points = this.series.points
      if (!points || this.point !== points[points.length - 1]) return null
      const name = this.series.name || ''
      return name.replace(/^Tier\s*/, 'T')
    }
  }
}

/**
 * Build Highcharts line-series configs for iso-value tier lines at quintile
 * cut points of {x_i + y_i}, clipped to the data bounding box. Each emitted
 * series carries a `custom.tier_k` field so the chart can recompute endpoints
 * later (e.g. on `chart.load` or `axis.afterSetExtremes`) by re-running
 * clip_tier_segment against current axis extremes.
 *
 * @param {object} params
 * @param {number[]} params.x_values
 * @param {number[]} params.y_values
 * @returns {object[]}
 */
const build_tier_series = ({ x_values, y_values }) => {
  const { k_values, data_bounds } = compute_tier_k_values({
    x_values,
    y_values
  })
  if (!data_bounds) return []

  const series = []
  k_values.forEach((k, i) => {
    const segment = clip_tier_segment({ k, ...data_bounds })
    if (!segment) return
    series.push({
      ...TIER_SERIES_BASE,
      name: `Tier ${i + 1}`,
      data: segment,
      custom: { tier_k: k }
    })
  })
  return series
}

export { build_tier_series, clip_tier_segment }
