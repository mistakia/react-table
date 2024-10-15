import React from 'react'
import PropTypes from 'prop-types'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import './scatter-plot-overlay.styl'

const ScatterPlotOverlay = ({
  data,
  x_column,
  y_column,
  x_accessor_path,
  y_accessor_path,
  get_point_label,
  on_close
}) => {
  const x_label = x_column.header_label || 'X Axis'
  const y_label = y_column.header_label || 'Y Axis'

  // Calculate average values for x and y
  const x_values = data
    .map((row) => parseFloat(row[x_accessor_path] || 0))
    .filter((x) => !isNaN(x))
  const y_values = data
    .map((row) => parseFloat(row[y_accessor_path] || 0))
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

  const options = {
    chart: {
      type: 'scatter',
      zoomType: 'xy'
    },
    title: {
      text: `${x_label} vs ${y_label}`
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
            align: 'left'
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
            align: 'left'
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
          enabled: true,
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
        }
      }
    },
    series: [
      {
        data: adjust_label_positions(
          data
            .map((row) => ({
              x: parseFloat(row[x_accessor_path] || 0),
              y: parseFloat(row[y_accessor_path] || 0),
              label: get_point_label(row),
              original_data: row
            }))
            .filter((point) => !isNaN(point.x) && !isNaN(point.y))
        )
      }
    ],
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
        </div>
      </ClickAwayListener>
    </div>
  )
}

ScatterPlotOverlay.propTypes = {
  data: PropTypes.array.isRequired,
  x_column: PropTypes.object,
  y_column: PropTypes.object,
  x_accessor_path: PropTypes.string,
  y_accessor_path: PropTypes.string,
  get_point_label: PropTypes.func,
  on_close: PropTypes.func.isRequired
}

export default ScatterPlotOverlay
