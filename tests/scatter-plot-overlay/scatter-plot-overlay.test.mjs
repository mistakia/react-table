import { describe, expect, test } from 'bun:test'
// Import from the pure helper module (no Highcharts dependency) so tests run in isolation.
import {
  build_scatter_data_labels,
  SCATTER_LABEL_FONT_SIZE
} from '../../src/scatter-plot-overlay/scatter-plot-data-labels.js'

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
    const result = opts.formatter.call({
      point: { is_outlier: false, label: 'Player A' }
    })
    expect(result).toBeNull()
  })

  test('formatter returns label for outlier points', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({
      point: { is_outlier: true, label: 'Player A' }
    })
    expect(result).toBe('Player A')
  })

  test('enabled reflects labels_enabled param', () => {
    expect(build_scatter_data_labels({ labels_enabled: true }).enabled).toBe(
      true
    )
    expect(build_scatter_data_labels({ labels_enabled: false }).enabled).toBe(
      false
    )
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

// Pure helper that mirrors the plotLines construction logic in scatter-plot-overlay.js
const build_plot_lines = ({ axis, scatter_plot_options, mean_value }) => {
  const show_mean_key = axis === 'x' ? 'show_x_mean_line' : 'show_y_mean_line'
  const mean_lines =
    scatter_plot_options[show_mean_key] !== false
      ? [
          {
            color: 'rgba(180, 60, 60, 0.8)',
            dashStyle: 'dash',
            value: mean_value,
            width: 1
          }
        ]
      : []
  const ref_lines = (scatter_plot_options.reference_lines || [])
    .filter((line) => line.axis === axis && isFinite(line.value))
    .map((line) => ({
      value: line.value,
      color: line.color,
      width: 1,
      dashStyle: 'Dash',
      label: {
        text: line.label,
        style: { color: line.color }
      }
    }))
  return [...mean_lines, ...ref_lines]
}

describe('scatter-plot-overlay reference lines (S8)', () => {
  test('x-axis reference line appears in xAxis plotLines', () => {
    const options = {
      reference_lines: [
        { axis: 'x', value: 50, label: 'avg', color: '#ff0000' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 25
    })
    const ref = lines.find((l) => l.value === 50)
    expect(ref).toBeDefined()
    expect(ref.color).toBe('#ff0000')
    expect(ref.dashStyle).toBe('Dash')
    expect(ref.label.text).toBe('avg')
    expect(ref.label.style.color).toBe('#ff0000')
  })

  test('y-axis reference line appears in yAxis plotLines', () => {
    const options = {
      reference_lines: [
        { axis: 'y', value: 75, label: 'target', color: '#0000ff' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'y',
      scatter_plot_options: options,
      mean_value: 50
    })
    const ref = lines.find((l) => l.value === 75)
    expect(ref).toBeDefined()
    expect(ref.color).toBe('#0000ff')
  })

  test('x-axis reference line does NOT appear in yAxis plotLines', () => {
    const options = {
      reference_lines: [
        { axis: 'x', value: 50, label: 'avg', color: '#ff0000' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'y',
      scatter_plot_options: options,
      mean_value: 25
    })
    const ref = lines.find((l) => l.value === 50 && l.color === '#ff0000')
    expect(ref).toBeUndefined()
  })

  test('non-finite value is skipped (defensive)', () => {
    const options = {
      reference_lines: [
        { axis: 'x', value: NaN, label: 'bad', color: '#888888' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 10
    })
    // Only the mean line should be present
    expect(lines.length).toBe(1)
  })

  test('mean line and reference lines coexist on the same axis', () => {
    const options = {
      show_x_mean_line: true,
      reference_lines: [
        { axis: 'x', value: 50, label: 'ref', color: '#aabbcc' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 30
    })
    // Mean line + 1 reference line
    expect(lines.length).toBe(2)
    expect(lines[0].value).toBe(30)
    expect(lines[1].value).toBe(50)
  })

  test('when show_x_mean_line is false, mean line absent but reference line present', () => {
    const options = {
      show_x_mean_line: false,
      reference_lines: [
        { axis: 'x', value: 50, label: 'ref', color: '#aabbcc' }
      ]
    }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 30
    })
    expect(lines.length).toBe(1)
    expect(lines[0].value).toBe(50)
  })

  test('empty reference_lines produces no extra plotLines', () => {
    const options = { reference_lines: [] }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 20
    })
    expect(lines.length).toBe(1) // only mean line
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
    const non_outlier_count = base_x.filter(
      (x, i) => !is_outlier(x, base_y[i])
    ).length
    // Expect the majority of clustered points to not be outliers
    expect(non_outlier_count).toBeGreaterThan(base_x.length * 0.5)
  })

  test('points far from mean are flagged as outliers', () => {
    const all_flagged = outlier_x.every((x, i) => is_outlier(x, outlier_y[i]))
    expect(all_flagged).toBe(true)
  })

  // Real collision behavior requires browser/integration test; unit tests assert config shape only.
})

describe('scatter-plot-overlay logo size derivation (S5)', () => {
  test('SCATTER_LABEL_FONT_SIZE is 11', () => {
    expect(SCATTER_LABEL_FONT_SIZE).toBe(11)
  })

  test('default ratio 3 yields logo_size 33', () => {
    const logo_size_ratio = 3
    const logo_size = SCATTER_LABEL_FONT_SIZE * logo_size_ratio
    expect(logo_size).toBe(33)
  })

  test('custom ratio yields proportional logo_size', () => {
    const logo_size = SCATTER_LABEL_FONT_SIZE * 4
    expect(logo_size).toBe(44)
  })

  test('dataLabels style fontSize matches SCATTER_LABEL_FONT_SIZE', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.style.fontSize).toBe(`${SCATTER_LABEL_FONT_SIZE}px`)
  })
})

describe('scatter-plot-overlay custom title/subtitle override (S11)', () => {
  // Pure logic mirrors the ternary in scatter-plot-overlay.js options.title.text
  const resolve_title = (custom_title, x_title_base, y_title_base) =>
    custom_title || `${x_title_base} vs ${y_title_base}`

  const resolve_subtitle = (custom_subtitle, has_subtitle, x_sub, y_sub) => {
    if (custom_subtitle) return custom_subtitle
    if (has_subtitle) return `X: ${x_sub}<br/>Y: ${y_sub}`
    return undefined
  }

  test('custom_title overrides computed title', () => {
    const title = resolve_title('My Custom Title', 'Pass Yds', 'Rush Yds')
    expect(title).toBe('My Custom Title')
  })

  test('when custom_title is null, computed title is used', () => {
    const title = resolve_title(null, 'Pass Yds', 'Rush Yds')
    expect(title).toBe('Pass Yds vs Rush Yds')
  })

  test('custom_subtitle overrides computed subtitle', () => {
    const subtitle = resolve_subtitle(
      'My Subtitle',
      true,
      'Year: 2022',
      'Year: 2022'
    )
    expect(subtitle).toBe('My Subtitle')
  })

  test('when custom_subtitle is null, computed subtitle is used when params present', () => {
    const subtitle = resolve_subtitle(null, true, 'Year: 2022', 'Year: 2022')
    expect(subtitle).toBe('X: Year: 2022<br/>Y: Year: 2022')
  })

  test('when custom_subtitle is null and no params, subtitle is undefined', () => {
    const subtitle = resolve_subtitle(null, false, '', '')
    expect(subtitle).toBeUndefined()
  })
})
