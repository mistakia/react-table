import React from 'react'
import PropTypes from 'prop-types'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import './scatter-plot-overlay.styl'

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
  const n = x_values.length
  const sum_x = x_values.reduce((a, b) => a + b, 0)
  const sum_y = y_values.reduce((a, b) => a + b, 0)
  const sum_xy = x_values.reduce((sum, x, i) => sum + x * y_values[i], 0)
  const sum_xx = x_values.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
  const intercept = (sum_y - slope * sum_x) / n

  const y_mean = sum_y / n
  const ss_tot = y_values.reduce((sum, y) => sum + Math.pow(y - y_mean, 2), 0)
  const ss_res = y_values.reduce((sum, y, i) => {
    const y_pred = slope * x_values[i] + intercept
    return sum + Math.pow(y - y_pred, 2)
  }, 0)
  const r_squared = 1 - ss_res / ss_tot

  return {
    slope,
    intercept,
    r_squared
  }
}

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
  is_scatter_plot_point_label_enabled = () => true
}) => {
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

  const adjust_label_positions = (points) => {
    const label_padding = 5
    const max_attempts = 5
    const positions = ['right', 'left', 'top', 'bottom']

    points.forEach((point) => {
      point.data_label_position = 'right' // Default position
    })

    for (let attempt = 0; attempt < max_attempts; attempt++) {
      let collisions = false

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          if (check_collision(points[i], points[j], label_padding)) {
            collisions = true
            points[j].data_label_position =
              positions[
                (positions.indexOf(points[j].data_label_position) + 1) %
                  positions.length
              ]
          }
        }
      }

      if (!collisions) break
    }

    return points
  }

  const check_collision = (point1, point2, padding) => {
    const get_label_bounds = (point) => {
      const label_width = 50 // Estimate label width
      const label_height = 20 // Estimate label height
      let x = point.x
      let y = point.y

      switch (point.data_label_position) {
        case 'right':
          x += padding
          break
        case 'left':
          x -= label_width + padding
          break
        case 'top':
          y += padding
          break
        case 'bottom':
          y -= label_height + padding
          break
      }

      return {
        left: x,
        right: x + label_width,
        top: y,
        bottom: y + label_height
      }
    }

    const bounds1 = get_label_bounds(point1)
    const bounds2 = get_label_bounds(point2)

    return !(
      bounds1.right < bounds2.left ||
      bounds1.left > bounds2.right ||
      bounds1.bottom < bounds2.top ||
      bounds1.top > bounds2.bottom
    )
  }

  const get_column_subtitle = (column, column_params) => {
    if (!column_params) return ''
    return Object.entries(column_params)
      .map(([key, value]) => `${key}(${value})`)
      .join(' ')
  }

  const x_subtitle = get_column_subtitle(x_column, x_column_params)
  const y_subtitle = get_column_subtitle(y_column, y_column_params)

  const [show_regression, set_show_regression] = React.useState(false)
  const [regression_stats, set_regression_stats] = React.useState(null)

  React.useEffect(() => {
    if (show_regression) {
      set_regression_stats(calculate_regression_stats({ x_values, y_values }))
    }
  }, [show_regression])

  const options = {
    chart: {
      type: 'scatter',
      zoomType: 'xy',
      height: 600
    },
    title: {
      text: `${x_label} vs ${y_label}`
    },
    subtitle: {
      text: `X: ${x_subtitle}<br/>Y: ${y_subtitle}`,
      style: {
        fontSize: '10px',
        fontWeight: 'normal'
      }
    },
    xAxis: {
      title: {
        text: x_label
      },
      gridLineWidth: 1,
      plotLines: [
        {
          color: 'red',
          dashStyle: 'dash',
          value: x_average,
          width: 2,
          label: {
            text: `${x_average.toFixed(2)}`,
            align: 'left',
            style: {
              color: 'red'
            }
          }
        }
      ]
    },
    yAxis: {
      title: {
        text: y_label
      },
      plotLines: [
        {
          color: 'red',
          dashStyle: 'dash',
          value: y_average,
          width: 2,
          label: {
            text: `${y_average.toFixed(2)}`,
            align: 'left',
            style: {
              color: 'red'
            }
          }
        }
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
        dataLabels: {
          enabled: is_scatter_plot_point_label_enabled({ rows: data }),
          formatter: function () {
            return this.point.label
          },
          allowOverlap: false,
          align: function () {
            return this.point.data_label_position
          },
          verticalAlign: function () {
            return this.point.data_label_position === 'top'
              ? 'bottom'
              : this.point.data_label_position === 'bottom'
                ? 'top'
                : 'middle'
          },
          style: {
            pointerEvents: 'none',
            textOutline: 'none'
          }
        },
        marker: {
          radius: 5,
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
      {
        id: 'scatter-plot-points',
        type: 'scatter',
        data: adjust_label_positions(
          data
            .map((row) => {
              const x = Number(row[x_accessor_path] || 0)
              const y = Number(row[y_accessor_path] || 0)
              const point = {
                x,
                y,
                label: get_point_label(row),
                original_data: row
              }

              if (get_point_image) {
                const image_data = get_point_image({
                  row,
                  total_rows: data.length
                })
                if (image_data) {
                  point.marker = {
                    symbol: `url(${image_data.url})`,
                    width: image_data.width || 32,
                    height: image_data.height || 32
                  }
                }
              }

              return point
            })
            .filter((point) => !isNaN(point.x) && !isNaN(point.y))
        )
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
          <HighchartsReact highcharts={Highcharts} options={options} />
          <div className='plot-controls'>
            <div
              onClick={() => set_show_regression(!show_regression)}
              className='regression-toggle'>
              <ShowChartIcon />
              {show_regression ? 'Hide' : 'Show'} Regression Line
            </div>
          </div>
          {show_regression && regression_stats && (
            <div className='regression-stats'>
              <h4>Regression Statistics</h4>
              <div>Slope: {regression_stats.slope.toFixed(4)}</div>
              <div>Y-Intercept: {regression_stats.intercept.toFixed(4)}</div>
              <div>R²: {regression_stats.r_squared.toFixed(4)}</div>
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
  is_scatter_plot_point_label_enabled: PropTypes.func
}

export default ScatterPlotOverlay
