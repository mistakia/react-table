import { describe, expect, test } from 'bun:test'
import { build_tier_series } from '../../src/scatter-plot-overlay/scatter-plot-tier-overlay.js'

describe('build_tier_series', () => {
  test('empty input returns []', () => {
    expect(build_tier_series({ x_values: [], y_values: [] })).toEqual([])
  })

  test('single point returns []', () => {
    expect(build_tier_series({ x_values: [1], y_values: [2] })).toEqual([])
  })

  test('null / undefined inputs return []', () => {
    expect(build_tier_series({ x_values: null, y_values: null })).toEqual([])
    expect(
      build_tier_series({ x_values: undefined, y_values: undefined })
    ).toEqual([])
  })

  test('5 well-spaced points produce 4 series with correct quintile k values', () => {
    // sums: 2, 4, 6, 8, 10  → sorted [2,4,6,8,10]
    // quantile at 0.2 → index 0.8 → 2*(0.2) + 4*(0.8) = 3.6
    // quantile at 0.4 → index 1.6 → 4*(0.4) + 6*(0.6) = 5.2
    // quantile at 0.6 → index 2.4 → 6*(0.6) + 8*(0.4) = 6.8
    // quantile at 0.8 → index 3.2 → 8*(0.8) + 10*(0.2) = 8.4
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })

    expect(result).toHaveLength(4)

    const k0 = result[0].data[0][0] + result[0].data[0][1]
    const k1 = result[1].data[0][0] + result[1].data[0][1]
    const k2 = result[2].data[0][0] + result[2].data[0][1]
    const k3 = result[3].data[0][0] + result[3].data[0][1]

    expect(k0).toBeCloseTo(3.6, 5)
    expect(k1).toBeCloseTo(5.2, 5)
    expect(k2).toBeCloseTo(6.8, 5)
    expect(k3).toBeCloseTo(8.4, 5)
  })

  test('all inputs identical produces output or handles degenerate case sensibly', () => {
    // sums all equal 4 → all quantiles collapse to 4 → unique_k = [4] → 1 series
    const x_values = [2, 2, 2, 2, 2]
    const y_values = [2, 2, 2, 2, 2]
    const result = build_tier_series({ x_values, y_values })
    // Must not throw; must return an array
    expect(Array.isArray(result)).toBe(true)
    // All points collapse to a single coordinate → bounding box has zero
    // width/height, every clipped segment is degenerate (sx >= ex) → no series.
    expect(result.length).toBe(0)
  })

  test('NaN entries are dropped before computing', () => {
    const x_values = [1, NaN, 3, 4, 5, 6, 7, 8, 9, 10]
    const y_values = [1, 2, NaN, 4, 5, 6, 7, 8, 9, 10]
    const result = build_tier_series({ x_values, y_values })
    expect(Array.isArray(result)).toBe(true)
    // Valid pairs: (1,1),(4,4),(5,5),(6,6),(7,7),(8,8),(9,9),(10,10) → 8 pairs, enough for 4 series
    expect(result.length).toBeGreaterThan(0)
  })

  test('each series has enableMouseTracking: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.enableMouseTracking).toBe(false)
    })
  })

  test('each series has dashStyle: Dot', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.dashStyle).toBe('Dot')
    })
  })

  test('each series has showInLegend: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.showInLegend).toBe(false)
    })
  })

  test('each series has marker.enabled: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.marker.enabled).toBe(false)
    })
  })

  test('series segments stay within the data bounding box', () => {
    // Iso-value (x+y=k, slope -1) lines are clipped to the data extent so
    // they never force the chart axes to expand.
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const x_min = 1
    const x_max = 5
    const y_min = 1
    const y_max = 5
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      const [sx, sy] = series.data[0]
      const [ex, ey] = series.data[1]
      expect(sx).toBeGreaterThanOrEqual(x_min)
      expect(sx).toBeLessThanOrEqual(x_max)
      expect(ex).toBeGreaterThanOrEqual(x_min)
      expect(ex).toBeLessThanOrEqual(x_max)
      expect(sy).toBeGreaterThanOrEqual(y_min)
      expect(sy).toBeLessThanOrEqual(y_max)
      expect(ey).toBeGreaterThanOrEqual(y_min)
      expect(ey).toBeLessThanOrEqual(y_max)
      expect(sx).toBeLessThan(ex)
    })
  })

  test('large-x / small-y data does not produce y-extending lines', () => {
    // Regression test: with x_max >> y_max, the unclipped y = k - x_max
    // would be a large negative number, expanding the chart y-axis and
    // collapsing the data band. Clipping must keep all y in [y_min, y_max].
    const x_values = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]
    const y_values = [50, 80, 90, 70, 60, 100, 40, 110, 30, 20]
    const y_min = 20
    const y_max = 110
    const result = build_tier_series({ x_values, y_values })
    expect(result.length).toBeGreaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([, y]) => {
        expect(y).toBeGreaterThanOrEqual(y_min)
        expect(y).toBeLessThanOrEqual(y_max)
      })
    })
  })

  test('tall-y / narrow-x data does not produce x-extending lines', () => {
    // Symmetric regression: x_max small, y_max large. Clipping must keep
    // all x within [x_min, x_max] regardless of how steep k is.
    const x_values = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]
    const y_values = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]
    const x_min = 10
    const x_max = 28
    const result = build_tier_series({ x_values, y_values })
    expect(result.length).toBeGreaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([x]) => {
        expect(x).toBeGreaterThanOrEqual(x_min)
        expect(x).toBeLessThanOrEqual(x_max)
      })
    })
  })

  test('negatively-correlated data clips correctly on both axes', () => {
    const x_values = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    const y_values = [900, 800, 700, 600, 500, 400, 300, 200, 100, 0]
    const result = build_tier_series({ x_values, y_values })
    const x_min = 0
    const x_max = 900
    const y_min = 0
    const y_max = 900
    expect(result.length).toBeGreaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(x_min)
        expect(x).toBeLessThanOrEqual(x_max)
        expect(y).toBeGreaterThanOrEqual(y_min)
        expect(y).toBeLessThanOrEqual(y_max)
      })
    })
  })

  test('series type is line', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.type).toBe('line')
    })
  })
})
