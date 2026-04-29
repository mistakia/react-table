import React from 'react'
import PropTypes from 'prop-types'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import './scatter-plot-overlay.styl'
import cdf from '@stdlib/stats-base-dists-t-cdf'
import ScatterPlotSettingsPanel from './scatter-plot-settings-panel'
import { resolve_point_color } from './scatter-plot-point-color-utils.js'
import {
  build_scatter_data_labels,
  SCATTER_LABEL_FONT_SIZE
} from './scatter-plot-data-labels.js'
import { build_tier_series } from './scatter-plot-tier-overlay.js'

const get_trend_line = (x_values, y_values) => {
  const n = x_values.length
  const sum_x = x_values.reduce((a, b) => a + b, 0)
  const sum_y = y_values.reduce((a, b) => a + b, 0)
  const sum_xy = x_values.reduce((sum, x, i) => sum + x * y_values[i], 0)
  const sum_xx = x_values.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
  const intercept = (sum_y - slope * sum_x) / n

  const min_x = Math.min(...x_values)
  const max_x = Math.max(...x_values)

  return [
    [min_x, min_x * slope + intercept],
    [max_x, max_x * slope + intercept]
  ]
}

const calculate_regression_stats = ({ x_values, y_values }) => {
  const sample_size = x_values.length
  const sum_x = x_values.reduce((acc, val) => acc + val, 0)
  const sum_y = y_values.reduce((acc, val) => acc + val, 0)
  const sum_xy = x_values.reduce((sum, x, i) => sum + x * y_values[i], 0)
  const sum_x_squared = x_values.reduce((sum, x) => sum + x * x, 0)

  const regression_slope =
    (sample_size * sum_xy - sum_x * sum_y) /
    (sample_size * sum_x_squared - sum_x * sum_x)
  const regression_intercept = (sum_y - regression_slope * sum_x) / sample_size

  const y_mean = sum_y / sample_size
  const total_sum_squares = y_values.reduce(
    (sum, y) => sum + Math.pow(y - y_mean, 2),
    0
  )
  const residual_sum_squares = y_values.reduce((sum, y, i) => {
    const predicted_y = regression_slope * x_values[i] + regression_intercept
    return sum + Math.pow(y - predicted_y, 2)
  }, 0)
  const r_squared = 1 - residual_sum_squares / total_sum_squares

  // Degrees of freedom and error calculations
  const degrees_of_freedom = sample_size - 2
  const mean_squared_error = residual_sum_squares / degrees_of_freedom
  const standard_error_slope = Math.sqrt(
    mean_squared_error / (sum_x_squared - (sum_x * sum_x) / sample_size)
  )
  const t_statistic = regression_slope / standard_error_slope

  // Calculate two-tailed p-value
  const p_value = 2 * (1 - cdf(Math.abs(t_statistic), degrees_of_freedom))

  return {
    slope: regression_slope,
    intercept: regression_intercept,
    r_squared,
    p_value,
    t_stat: t_statistic
  }
}

const format_stat_value = ({ value, threshold = 0.0001 }) => {
  return Math.abs(value) < threshold ? value.toExponential(4) : value.toFixed(4)
}

const calculate_std_dev = (values, mean) => {
  const sum_sq = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0)
  return Math.sqrt(sum_sq / values.length)
}

export { resolve_point_color } from './scatter-plot-point-color-utils.js'
export { build_scatter_data_labels } from './scatter-plot-data-labels.js'

const ScatterPlotOverlay = ({
  data,
  x_column,
  y_column,
  x_accessor_path,
  x_column_params,
  y_accessor_path,
  y_column_params,
  get_point_label,
  on_close,
  get_point_image = null,
  get_point_color = null,
  get_scatter_point_label_suffix = null,
  is_scatter_plot_point_label_enabled = () => true,
  scatter_plot_options = {},
  on_scatter_plot_options_change = null,
  logo_size_ratio = 3
}) => {
  const logo_size = SCATTER_LABEL_FONT_SIZE * logo_size_ratio
  const x_label = x_column.header_label || 'X Axis'
  const y_label = y_column.header_label || 'Y Axis'

  const x_values = data
    .map((row) => Number(row[x_accessor_path] || 0))
    .filter((x) => !isNaN(x))
  const y_values = data
    .map((row) => Number(row[y_accessor_path] || 0))
    .filter((y) => !isNaN(y))
  const x_average = x_values.reduce((sum, x) => sum + x, 0) / x_values.length
  const y_average = y_values.reduce((sum, y) => sum + y, 0) / y_values.length
  const x_std_dev = calculate_std_dev(x_values, x_average)
  const y_std_dev = calculate_std_dev(y_values, y_average)

  const is_outlier = (x, y) => {
    const x_distance = Math.abs(x - x_average) / (x_std_dev || 1)
    const y_distance = Math.abs(y - y_average) / (y_std_dev || 1)
    const combined_distance = Math.sqrt(
      x_distance * x_distance + y_distance * y_distance
    )
    return combined_distance > 1.0
  }

  const get_column_subtitle = (column, column_params) => {
    if (!column_params) return ''
    return Object.entries(column_params)
      .map(([key, value]) => `${key}(${value})`)
      .join(' ')
  }

  const x_subtitle = get_column_subtitle(x_column, x_column_params)
  const y_subtitle = get_column_subtitle(y_column, y_column_params)
  const has_subtitle = Boolean(x_subtitle || y_subtitle)

  const [show_regression, set_show_regression] = React.useState(false)
  const [regression_stats, set_regression_stats] = React.useState(null)
  const [local_scatter_plot_options, set_local_scatter_plot_options] =
    React.useState(() => scatter_plot_options || {})

  // Read from local state so settings-panel changes take effect immediately without a prop change.
  const point_color_mode = local_scatter_plot_options?.point_color_mode

  React.useEffect(() => {
    set_local_scatter_plot_options(scatter_plot_options || {})
  }, [scatter_plot_options])

  const handle_scatter_plot_options_change = (next_options) => {
    set_local_scatter_plot_options(next_options)
    if (on_scatter_plot_options_change) {
      on_scatter_plot_options_change(next_options)
    }
  }

  const handle_download_png = () => {
    // TODO: S13 — implement PNG download via Highcharts exporting module
  }

  const tier_series = local_scatter_plot_options.show_tier_grid
    ? build_tier_series({ x_values, y_values })
    : []

  React.useEffect(() => {
    if (show_regression) {
      // x_values / y_values are derived from the scatter data series only,
      // so tier series are already excluded from the regression computation.
      set_regression_stats(calculate_regression_stats({ x_values, y_values }))
    }
  }, [show_regression])

  // Add ESC key handler to close the overlay
  React.useEffect(() => {
    const handle_key_down = (event) => {
      if (event.key === 'Escape') {
        on_close()
      }
    }

    document.addEventListener('keydown', handle_key_down)

    return () => {
      document.removeEventListener('keydown', handle_key_down)
    }
  }, [on_close])

  const labels_enabled = is_scatter_plot_point_label_enabled({ rows: data })

  const options = {
    chart: {
      type: 'scatter',
      zoomType: 'xy',
      height: 600
    },
    title: {
      text: `${x_label} vs ${y_label}`
    },
    subtitle: has_subtitle
      ? {
          text: `X: ${x_subtitle}<br/>Y: ${y_subtitle}`,
          style: {
            fontSize: '10px',
            fontWeight: 'normal'
          }
        }
      : undefined,
    xAxis: {
      title: {
        text: x_label
      },
      gridLineWidth: 1,
      plotLines: [
        ...(local_scatter_plot_options.show_x_mean_line !== false
          ? [
              {
                color: 'rgba(180, 60, 60, 0.8)',
                dashStyle: 'dash',
                value: x_average,
                width: 1,
                label: {
                  text: `avg ${x_average.toFixed(2)}`,
                  align: 'left',
                  style: {
                    color: 'rgba(180, 60, 60, 0.9)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }
                }
              }
            ]
          : []),
        ...(local_scatter_plot_options.reference_lines || [])
          .filter((line) => line.axis === 'x' && isFinite(line.value))
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
      ]
    },
    yAxis: {
      title: {
        text: y_label
      },
      plotLines: [
        ...(local_scatter_plot_options.show_y_mean_line !== false
          ? [
              {
                color: 'rgba(180, 60, 60, 0.8)',
                dashStyle: 'dash',
                value: y_average,
                width: 1,
                label: {
                  text: `avg ${y_average.toFixed(2)}`,
                  align: 'left',
                  style: {
                    color: 'rgba(180, 60, 60, 0.9)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }
                }
              }
            ]
          : []),
        ...(local_scatter_plot_options.reference_lines || [])
          .filter((line) => line.axis === 'y' && isFinite(line.value))
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
      ]
    },
    tooltip: {
      formatter: function () {
        const point_label = get_point_label(this.point.options.original_data)
        return `<b>${point_label}</b><br/>${x_label}: ${this.x}<br/>${y_label}: ${this.y}`
      },
      style: {
        zIndex: 1000
      }
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      scatter: {
        dataLabels: build_scatter_data_labels({
          labels_enabled,
          get_scatter_point_label_suffix
        }),
        marker: {
          radius: 5,
          fillOpacity: 0.6,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(100,100,100)'
            }
          }
        },
        states: {
          hover: {
            marker: {
              enabled: false
            }
          }
        }
      }
    },
    series: [
      ...tier_series,
      {
        id: 'scatter-plot-points',
        type: 'scatter',
        color: 'rgba(37, 99, 235, 0.5)',
        data: data
          .map((row) => {
            const x = Number(row[x_accessor_path] || 0)
            const y = Number(row[y_accessor_path] || 0)
            const point = {
              x,
              y,
              label: get_point_label(row),
              original_data: row,
              is_outlier: is_outlier(x, y)
            }

            const resolved_color = resolve_point_color({
              row,
              point_color_mode,
              get_point_color
            })
            if (resolved_color) {
              // Set marker fill color only. Data label color is handled via the series-level
              // dataLabels.color callback in build_scatter_data_labels, which reads this.point.color.
              // Per-point dataLabels objects would overwrite the series formatter and allowOverlap config.
              point.color = resolved_color
            }

            if (get_point_image) {
              const image_data = get_point_image({
                row,
                logo_size
              })
              if (image_data) {
                point.marker = {
                  symbol: `url(${image_data.url})`,
                  width: image_data.width || 32,
                  height: image_data.height || 32
                }
              } else {
                point.marker = {
                  symbol: 'circle',
                  radius: 1,
                  fillColor: '#2563eb',
                  lineWidth: 1,
                  lineColor: '#1e40af'
                }
              }
            }

            return point
          })
          .filter((point) => !isNaN(point.x) && !isNaN(point.y))
      },
      show_regression && {
        type: 'line',
        name: 'Trend Line',
        data: get_trend_line(x_values, y_values),
        marker: {
          enabled: false
        },
        states: {
          hover: {
            lineWidth: 0
          }
        },
        enableMouseTracking: false,
        color: 'rgba(255, 0, 0, 0.5)',
        lineWidth: 3
      }
    ].filter(Boolean),
    credits: {
      enabled: false
    }
  }

  return (
    <div className='scatter-plot-overlay'>
      <ClickAwayListener onClickAway={on_close}>
        <div className='scatter-plot-container'>
          <IconButton
            className='close-button'
            onClick={on_close}
            size='small'
            aria_label='close'>
            <CloseIcon />
          </IconButton>
          <ScatterPlotSettingsPanel
            scatter_plot_options={local_scatter_plot_options}
            on_change={handle_scatter_plot_options_change}
            show_regression={show_regression}
            on_toggle_regression={() => set_show_regression(!show_regression)}
            on_download_png={handle_download_png}
          />
          <HighchartsReact highcharts={Highcharts} options={options} />
          {show_regression && regression_stats && (
            <div className='regression-stats'>
              <h4>Regression Statistics</h4>
              <div>
                Slope: {format_stat_value({ value: regression_stats.slope })}
              </div>
              <div>
                Y-Intercept:{' '}
                {format_stat_value({ value: regression_stats.intercept })}
              </div>
              <div>
                R²: {format_stat_value({ value: regression_stats.r_squared })}
              </div>
              <div>
                p Value:{' '}
                {format_stat_value({ value: regression_stats.p_value })}
              </div>
            </div>
          )}
        </div>
      </ClickAwayListener>
    </div>
  )
}

ScatterPlotOverlay.propTypes = {
  data: PropTypes.array.isRequired,
  x_column: PropTypes.object,
  y_column: PropTypes.object,
  x_column_params: PropTypes.object,
  y_column_params: PropTypes.object,
  x_accessor_path: PropTypes.string,
  y_accessor_path: PropTypes.string,
  get_point_label: PropTypes.func,
  on_close: PropTypes.func.isRequired,
  get_point_image: PropTypes.func,
  get_point_color: PropTypes.func,
  get_scatter_point_label_suffix: PropTypes.func,
  is_scatter_plot_point_label_enabled: PropTypes.func,
  scatter_plot_options: PropTypes.object,
  on_scatter_plot_options_change: PropTypes.func,
  logo_size_ratio: PropTypes.number
}

export default ScatterPlotOverlay
