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
    // With deduplication, all cuts identical → 1 unique series
    expect(result.length).toBe(1)
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

  test('series data spans the x range', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.data[0][0]).toBe(1) // x_min
      expect(series.data[1][0]).toBe(5) // x_max
    })
  })

  test('is_tier_series flag is set for filtering regression stats', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.is_tier_series).toBe(true)
    })
  })
})
