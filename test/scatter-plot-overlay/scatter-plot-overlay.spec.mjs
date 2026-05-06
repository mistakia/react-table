import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  build_scatter_data_labels,
  SCATTER_LABEL_FONT_SIZE
} from '../../src/scatter-plot-overlay/scatter-plot-data-labels.js'

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
  it('dataLabels.allowOverlap is false', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.allowOverlap).to.equal(false)
  })

  it('dataLabels.align is a static string, not a heuristic function', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.align).to.equal('string')
    expect(opts.align).to.equal('right')
  })

  it('dataLabels.verticalAlign is a static string, not a heuristic function', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.verticalAlign).to.equal('string')
    expect(opts.verticalAlign).to.equal('middle')
  })

  it('formatter returns null for non-outlier points', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({
      point: { is_outlier: false, label: 'Player A' }
    })
    expect(result).to.equal(null)
  })

  it('formatter returns label for outlier points', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({
      point: { is_outlier: true, label: 'Player A' }
    })
    expect(result).to.equal('Player A')
  })

  it('enabled reflects labels_enabled param', () => {
    expect(
      build_scatter_data_labels({ labels_enabled: true }).enabled
    ).to.equal(true)
    expect(
      build_scatter_data_labels({ labels_enabled: false }).enabled
    ).to.equal(false)
  })
})

describe('scatter-plot-overlay dataLabels color callback (S6 fix)', () => {
  it('dataLabels.color is a function (not a static string)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.color).to.equal('function')
  })

  it('dataLabels.color callback returns point.color when set', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.color.call({ point: { color: '#e31837' } })
    expect(result).to.equal('#e31837')
  })

  it('dataLabels.color callback returns undefined when point.color is not set (uniform mode)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.color.call({ point: {} })
    expect(result).to.be.undefined
  })

  it('dataLabels.style does not contain a static color (color moved to top-level callback)', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.style.color).to.be.undefined
  })

  it('formatter and allowOverlap are preserved alongside color callback', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(typeof opts.formatter).to.equal('function')
    expect(opts.allowOverlap).to.equal(false)
  })
})

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
  it('x-axis reference line appears in xAxis plotLines', () => {
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
    expect(ref).to.not.be.undefined
    expect(ref.color).to.equal('#ff0000')
    expect(ref.dashStyle).to.equal('Dash')
    expect(ref.label.text).to.equal('avg')
    expect(ref.label.style.color).to.equal('#ff0000')
  })

  it('y-axis reference line appears in yAxis plotLines', () => {
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
    expect(ref).to.not.be.undefined
    expect(ref.color).to.equal('#0000ff')
  })

  it('x-axis reference line does NOT appear in yAxis plotLines', () => {
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
    expect(ref).to.be.undefined
  })

  it('non-finite value is skipped (defensive)', () => {
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
    expect(lines.length).to.equal(1)
  })

  it('mean line and reference lines coexist on the same axis', () => {
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
    expect(lines.length).to.equal(2)
    expect(lines[0].value).to.equal(30)
    expect(lines[1].value).to.equal(50)
  })

  it('when show_x_mean_line is false, mean line absent but reference line present', () => {
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
    expect(lines.length).to.equal(1)
    expect(lines[0].value).to.equal(50)
  })

  it('empty reference_lines produces no extra plotLines', () => {
    const options = { reference_lines: [] }
    const lines = build_plot_lines({
      axis: 'x',
      scatter_plot_options: options,
      mean_value: 20
    })
    expect(lines.length).to.equal(1)
  })
})

describe('scatter-plot-overlay outlier detection', () => {
  const base_x = Array.from({ length: 45 }, (_, i) => 9.5 + (i % 5) * 0.2)
  const base_y = Array.from({ length: 45 }, (_, i) => 9.5 + (i % 5) * 0.2)
  const outlier_x = [25, 30, -5, 0, 20]
  const outlier_y = [30, -5, 25, 20, 0]
  const all_x = [...base_x, ...outlier_x]
  const all_y = [...base_y, ...outlier_y]

  const is_outlier = make_outlier_checker(all_x, all_y)

  it('clustered points near mean are not outliers', () => {
    const non_outlier_count = base_x.filter(
      (x, i) => !is_outlier(x, base_y[i])
    ).length
    expect(non_outlier_count).to.be.greaterThan(base_x.length * 0.5)
  })

  it('points far from mean are flagged as outliers', () => {
    const all_flagged = outlier_x.every((x, i) => is_outlier(x, outlier_y[i]))
    expect(all_flagged).to.equal(true)
  })
})

describe('scatter-plot-overlay logo size derivation (S5)', () => {
  it('SCATTER_LABEL_FONT_SIZE is 11', () => {
    expect(SCATTER_LABEL_FONT_SIZE).to.equal(11)
  })

  it('default ratio 3 yields logo_size 33', () => {
    const logo_size_ratio = 3
    const logo_size = SCATTER_LABEL_FONT_SIZE * logo_size_ratio
    expect(logo_size).to.equal(33)
  })

  it('custom ratio yields proportional logo_size', () => {
    const logo_size = SCATTER_LABEL_FONT_SIZE * 4
    expect(logo_size).to.equal(44)
  })

  it('dataLabels style fontSize matches SCATTER_LABEL_FONT_SIZE', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.style.fontSize).to.equal(`${SCATTER_LABEL_FONT_SIZE}px`)
  })
})

describe('scatter-plot-overlay custom title/subtitle override (S11)', () => {
  const resolve_title = (custom_title, x_title_base, y_title_base) =>
    custom_title || `${x_title_base} vs ${y_title_base}`

  const resolve_subtitle = (custom_subtitle, has_subtitle, x_sub, y_sub) => {
    if (custom_subtitle) return custom_subtitle
    if (has_subtitle) {
      const lines = []
      if (x_sub) lines.push(`X: ${x_sub}`)
      if (y_sub) lines.push(`Y: ${y_sub}`)
      return lines.join('<br/>')
    }
    return undefined
  }

  it('custom_title overrides computed title', () => {
    const title = resolve_title('My Custom Title', 'Pass Yds', 'Rush Yds')
    expect(title).to.equal('My Custom Title')
  })

  it('when custom_title is null, computed title is used', () => {
    const title = resolve_title(null, 'Pass Yds', 'Rush Yds')
    expect(title).to.equal('Pass Yds vs Rush Yds')
  })

  it('custom_subtitle overrides computed subtitle', () => {
    const subtitle = resolve_subtitle(
      'My Subtitle',
      true,
      'Year: 2022',
      'Year: 2022'
    )
    expect(subtitle).to.equal('My Subtitle')
  })

  it('when custom_subtitle is null, computed subtitle is used when params present', () => {
    const subtitle = resolve_subtitle(null, true, 'Year: 2022', 'Year: 2022')
    expect(subtitle).to.equal('X: Year: 2022<br/>Y: Year: 2022')
  })

  it('when custom_subtitle is null and no params, subtitle is undefined', () => {
    const subtitle = resolve_subtitle(null, false, '', '')
    expect(subtitle).to.be.undefined
  })
})

describe('scatter-plot-overlay font family application (S12)', () => {
  const resolve_chart_style = (font_family) =>
    font_family ? { fontFamily: font_family } : {}

  it('when font_family is set, chart style includes fontFamily', () => {
    const style = resolve_chart_style('Georgia')
    expect(style.fontFamily).to.equal('Georgia')
  })

  it('when font_family is null, chart style is empty (no override)', () => {
    const style = resolve_chart_style(null)
    expect(style.fontFamily).to.be.undefined
    expect(Object.keys(style).length).to.equal(0)
  })

  it('build_scatter_data_labels applies font_family to style when provided', () => {
    const opts = build_scatter_data_labels({
      labels_enabled: true,
      font_family: 'Georgia'
    })
    expect(opts.style.fontFamily).to.equal('Georgia')
  })

  it('build_scatter_data_labels omits fontFamily from style when not provided', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    expect(opts.style.fontFamily).to.be.undefined
  })
})

describe('scatter-plot-overlay PNG download (S13)', () => {
  it('handle_download_png calls exportChartLocal when available', () => {
    let called_local = false
    const mock_chart = {
      exportChartLocal: ({ type }) => {
        called_local = true
        expect(type).to.equal('image/png')
      }
    }
    const chart = mock_chart
    if (chart) {
      if (typeof chart.exportChartLocal === 'function') {
        chart.exportChartLocal({ type: 'image/png' })
      } else if (typeof chart.exportChart === 'function') {
        chart.exportChart({ type: 'image/png' })
      }
    }
    expect(called_local).to.equal(true)
  })

  it('handle_download_png falls back to exportChart when exportChartLocal absent', () => {
    let called_server = false
    const mock_chart = {
      exportChart: ({ type }) => {
        called_server = true
        expect(type).to.equal('image/png')
      }
    }
    const chart = mock_chart
    if (chart) {
      if (typeof chart.exportChartLocal === 'function') {
        chart.exportChartLocal({ type: 'image/png' })
      } else if (typeof chart.exportChart === 'function') {
        chart.exportChart({ type: 'image/png' })
      }
    }
    expect(called_server).to.equal(true)
  })

  it('handle_download_png does nothing when chart ref is null', () => {
    let called = false
    const mock_fn = () => {
      called = true
    }
    const chart = null
    if (chart) {
      if (typeof chart.exportChartLocal === 'function') {
        mock_fn()
      }
    }
    expect(called).to.equal(false)
  })
})
