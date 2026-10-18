import React from 'react'
import PropTypes from 'prop-types'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import './bar-chart-overlay.styl'
import BarChartSettingsPanel from './bar-chart-settings-panel'
import { build_bar_chart_options } from './bar-chart-options.js'
import { export_chart_png } from '../utils/export-chart-png.js'
import { resolve_chart_colors } from '../utils/chart-colors.js'
import { use_host_theme } from '../utils/use-host-theme.js'
// Highcharts 12: exporting modules self-compose at import time; no initializer call.
import 'highcharts/modules/exporting'
import 'highcharts/modules/offline-exporting'

// How long a freshly mounted chart takes to grow its bars in. Long enough to
// read as a build rather than a flash, short enough that flipping orientation
// does not feel like waiting on the chart.
export const BAR_CHART_MOUNT_ANIMATION_MS = 500

// A ranked bar chart of one numeric column against each row's own identity.
//
// Nothing here knows what a row IS. Subject label, bar colour and the image
// that rides on the bar end all arrive as consumer-supplied resolvers, which
// is what keeps this file shareable with consumers that have no notion of a
// team, a logo or a league.
const BarChartOverlay = ({
  data,
  column = {},
  accessor_path,
  get_label = () => '',
  get_color = null,
  get_image = null,
  footer_text = null,
  bar_chart_options = {},
  on_bar_chart_options_change = null,
  on_close
}) => {
  const [local_options, set_local_options] = React.useState(
    () => bar_chart_options || {}
  )

  // Parents commonly pass a fresh object literal each render. Keying on the
  // serialized content lets React's primitive dep equality skip the update
  // when nothing actually changed, without clobbering a pending local edit.
  const options_serialized = JSON.stringify(bar_chart_options || {})
  React.useEffect(() => {
    set_local_options(bar_chart_options || {})
  }, [options_serialized])

  const chart_instance_ref = React.useRef(null)

  React.useEffect(() => {
    const handle_key_down = (event) => {
      if (event.key === 'Escape') on_close()
    }
    document.addEventListener('keydown', handle_key_down)
    return () => document.removeEventListener('keydown', handle_key_down)
  }, [on_close])

  const handle_options_change = (next_options) => {
    set_local_options(next_options)
    if (on_bar_chart_options_change) on_bar_chart_options_change(next_options)
  }

  const handle_download_png = () => {
    export_chart_png(chart_instance_ref.current)
  }

  // Highcharts takes resolved colours, so they are read again when the host's
  // theme changes, and the chart is keyed to the theme below.
  const theme = use_host_theme()
  const colors = React.useMemo(() => resolve_chart_colors(), [theme])

  const chart_options = React.useMemo(() => {
    const built = build_bar_chart_options({
      data,
      accessor_path,
      column,
      get_label,
      get_color,
      get_image,
      bar_chart_options: local_options,
      footer_text,
      colors
    })
    return {
      ...built,
      chart: {
        ...built.chart,
        events: {
          load: function () {
            chart_instance_ref.current = this
          }
        }
      },
      // The builder stays animation-free on purpose: it is a pure function of
      // the table state, and anything reading geometry back out of a chart
      // rendered straight from its output would otherwise race the transition
      // and get mid-flight numbers. Growth is a property of MOUNTING a chart,
      // which only this component knows about, so it is layered on here.
      plotOptions: {
        ...built.plotOptions,
        series: {
          ...built.plotOptions.series,
          animation: { duration: BAR_CHART_MOUNT_ANIMATION_MS }
        }
      }
    }
  }, [
    data,
    accessor_path,
    column,
    get_label,
    get_color,
    get_image,
    local_options,
    footer_text,
    colors
  ])

  const is_empty = chart_options.custom.is_empty

  // Flipping orientation is a different CHART, not a new shape for this one.
  // highcharts-react-official applies any changed options object with
  // chart.update(options, true, true), so without a key Highcharts transitions
  // the LIVE bars across the inversion and the whole plot appears to rotate.
  // Keying the mount to orientation throws the old chart away instead, and the
  // replacement runs its own build animation: a column series grows up from the
  // zero baseline, a bar series out from the side. Every other option change
  // keeps the update path, where morphing is the right behaviour.
  //
  // A theme change remounts too. chart.update() would take the newly resolved
  // option colours, but not the global defaults a host re-applies on a theme
  // change (axis lines, title, tooltip), which a chart reads only when built.
  const orientation =
    local_options.orientation === 'horizontal' ? 'horizontal' : 'vertical'

  const handle_backdrop_click = (event) => {
    if (event.target === event.currentTarget) on_close()
  }

  return (
    <div className='bar-chart-overlay' onMouseDown={handle_backdrop_click}>
      <div className='bar-chart-container'>
        <button
          className='bar-chart-close-button'
          type='button'
          onClick={on_close}
          aria-label='Close bar chart'>
          &times;
        </button>
        <BarChartSettingsPanel
          bar_chart_options={local_options}
          row_count={chart_options.custom.row_count}
          total_row_count={chart_options.custom.total_row_count}
          on_change={handle_options_change}
          on_download_png={handle_download_png}
        />
        {/* An empty result draws as an axis pair over blank space, which reads
            as a broken chart rather than as no matching rows. Say it instead. */}
        {is_empty ? (
          <div className='bar-chart-empty'>
            No rows with a value for this column.
          </div>
        ) : (
          <HighchartsReact
            key={`${orientation}-${theme}`}
            highcharts={Highcharts}
            options={chart_options}
          />
        )}
      </div>
    </div>
  )
}

BarChartOverlay.propTypes = {
  data: PropTypes.array.isRequired,
  column: PropTypes.object,
  accessor_path: PropTypes.string,
  get_label: PropTypes.func,
  get_color: PropTypes.func,
  get_image: PropTypes.func,
  footer_text: PropTypes.string,
  bar_chart_options: PropTypes.object,
  on_bar_chart_options_change: PropTypes.func,
  on_close: PropTypes.func.isRequired
}

export { build_bar_chart_options } from './bar-chart-options.js'

export default BarChartOverlay
