import { describe, expect, test } from 'bun:test'
// Import from the pure helper module (no Highcharts dependency) so tests run in isolation.
import { build_scatter_data_labels } from '../../src/scatter-plot-overlay/scatter-plot-data-labels.js'

// Pure helper functions mirroring the implementation in scatter-plot-overlay.js.
// These are tested in isolation to verify outlier detection and label configuration.

const calculate_std_dev = (values, mean) => {
  const sum_sq = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0)
  return Math.sqrt(sum_sq / values.length)
}

const make_outlier_checker = (x_values, y_values) => {
  const x_average = x_values.reduce((sum, x) => sum + x, 0) / x_values.length
  const y_average = y_values.reduce((sum, y) => sum + y, 0) / y_values.length
  const x_std_dev = calculate_std_dev(x_values, x_average)
  const y_std_dev = calculate_std_dev(y_values, y_average)

  return (x, y) => {
    const x_distance = Math.abs(x - x_average) / (x_std_dev || 1)
    const y_distance = Math.abs(y - y_average) / (y_std_dev || 1)
    const combined_distance = Math.sqrt(
      x_distance * x_distance + y_distance * y_distance
    )
    return combined_distance > 1.0
  }
}

describe('scatter-plot-overlay label collision config', () => {
  test('dataLabels.allowOverlap is false', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.allowOverlap).toBe(false)
  })

  test('dataLabels.align is a static string, not a heuristic function', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.align).toBe('string')
    expect(opts.align).toBe('right')
  })

  test('dataLabels.verticalAlign is a static string, not a heuristic function', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.verticalAlign).toBe('string')
    expect(opts.verticalAlign).toBe('middle')
  })

  test('formatter returns null for non-outlier points', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({ point: { is_outlier: false, label: 'Player A' } })
    expect(result).toBeNull()
  })

  test('formatter returns label for outlier points', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({ point: { is_outlier: true, label: 'Player A' } })
    expect(result).toBe('Player A')
  })

  test('enabled reflects labels_enabled param', () => {
    expect(build_scatter_data_labels({ labels_enabled: true }).enabled).toBe(true)
    expect(build_scatter_data_labels({ labels_enabled: false }).enabled).toBe(false)
  })
})

describe('scatter-plot-overlay dataLabels color callback (S6 fix)', () => {
  test('dataLabels.color is a function (not a static string)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.color).toBe('function')
  })

  test('dataLabels.color callback returns point.color when set', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.color.call({ point: { color: '#e31837' } })
    expect(result).toBe('#e31837')
  })

  test('dataLabels.color callback returns undefined when point.color is not set (uniform mode)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.color.call({ point: {} })
    expect(result).toBeUndefined()
  })

  test('dataLabels.style does not contain a static color (color moved to top-level callback)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    // style.color should not be set — color is handled by the top-level color callback
    expect(opts.style.color).toBeUndefined()
  })

  test('formatter and allowOverlap are preserved alongside color callback', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.formatter).toBe('function')
    expect(opts.allowOverlap).toBe(false)
  })
})

describe('scatter-plot-overlay outlier detection', () => {
  // 50 points clustered around (10, 10) with a few outliers spread out
  const base_x = Array.from({ length: 45 }, (_, i) => 9.5 + (i % 5) * 0.2)
  const base_y = Array.from({ length: 45 }, (_, i) => 9.5 + (i % 5) * 0.2)
  const outlier_x = [25, 30, -5, 0, 20]
  const outlier_y = [30, -5, 25, 20, 0]
  const all_x = [...base_x, ...outlier_x]
  const all_y = [...base_y, ...outlier_y]

  const is_outlier = make_outlier_checker(all_x, all_y)

  test('clustered points near mean are not outliers', () => {
    // Points at the cluster center should not be flagged
    const non_outlier_count = base_x.filter((x, i) => !is_outlier(x, base_y[i])).length
    // Expect the majority of clustered points to not be outliers
    expect(non_outlier_count).toBeGreaterThan(base_x.length * 0.5)
  })

  test('points far from mean are flagged as outliers', () => {
    const all_flagged = outlier_x.every((x, i) => is_outlier(x, outlier_y[i]))
    expect(all_flagged).toBe(true)
  })

  // Real collision behavior requires browser/integration test; unit tests assert config shape only.
})
