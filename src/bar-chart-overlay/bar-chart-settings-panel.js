import React from 'react'
import PropTypes from 'prop-types'
import './bar-chart-settings-panel.styl'

// Orientation, the two label toggles and a PNG export. Deliberately smaller
// than the scatter plot's panel: a ranked bar has one metric and one ordering,
// so there is no axis to configure and nothing to regress.
const BarChartSettingsPanel = ({
  bar_chart_options,
  on_change,
  on_download_png
}) => {
  const orientation =
    bar_chart_options.orientation === 'horizontal' ? 'horizontal' : 'vertical'
  const show_average_line = bar_chart_options.show_average_line !== false
  const show_value_labels = bar_chart_options.show_value_labels !== false

  const set_orientation = (next) =>
    on_change({ ...bar_chart_options, orientation: next })

  const toggle = (key) =>
    on_change({
      ...bar_chart_options,
      // Both default to ON, so the first click must write an explicit false
      // rather than delete the key -- absence means enabled.
      [key]: bar_chart_options[key] === false
    })

  return (
    <div className='bar-chart-toolbar'>
      <div
        className='bar-chart-orientation'
        role='group'
        aria-label='Orientation'>
        <button
          type='button'
          className={`toolbar-btn${orientation === 'vertical' ? ' active' : ''}`}
          onClick={() => set_orientation('vertical')}>
          Vertical
        </button>
        <button
          type='button'
          className={`toolbar-btn${orientation === 'horizontal' ? ' active' : ''}`}
          onClick={() => set_orientation('horizontal')}>
          Horizontal
        </button>
      </div>
      <span className='toolbar-divider' aria-hidden='true' />
      <button
        type='button'
        className={`toolbar-btn${show_average_line ? ' active' : ''}`}
        onClick={() => toggle('show_average_line')}
        title='Toggle the average reference line'>
        Average
      </button>
      <button
        type='button'
        className={`toolbar-btn${show_value_labels ? ' active' : ''}`}
        onClick={() => toggle('show_value_labels')}
        title='Toggle value labels'>
        Values
      </button>
      <span className='toolbar-divider' aria-hidden='true' />
      <button
        type='button'
        className='toolbar-btn'
        onClick={on_download_png}
        title='Download chart as PNG'>
        PNG
      </button>
    </div>
  )
}

BarChartSettingsPanel.propTypes = {
  bar_chart_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  on_download_png: PropTypes.func.isRequired
}

export default BarChartSettingsPanel
