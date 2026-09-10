import React from 'react'
import PropTypes from 'prop-types'
import ChartSettingsModal from '../chart-settings-modal'
import './bar-chart-settings-panel.styl'

const MAX_TEXT_LENGTH = 200

// Everything the persisted options schema carries that is TEXT or precision.
// Orientation and the two visibility toggles stay on the toolbar, where they
// are one click rather than a modal round trip.
//
// `font_family` is deliberately absent, though the schema still accepts it.
// The chart now inherits the page's face by default, which is the app's own
// type ramp; a picker here would offer a user the chance to take one chart off
// it, and no consumer has asked for that. A caller can still set the field.
const BarChartSettingsModal = ({ bar_chart_options, on_change, on_close }) => {
  const [custom_title, set_custom_title] = React.useState(
    bar_chart_options.custom_title || ''
  )
  const [custom_subtitle, set_custom_subtitle] = React.useState(
    bar_chart_options.custom_subtitle || ''
  )
  const [custom_y_axis_title, set_custom_y_axis_title] = React.useState(
    bar_chart_options.custom_y_axis_title || ''
  )
  const [custom_x_axis_title, set_custom_x_axis_title] = React.useState(
    bar_chart_options.custom_x_axis_title || ''
  )
  const [average_line_label, set_average_line_label] = React.useState(
    bar_chart_options.average_line_label || ''
  )
  // Held as a STRING while editing so the field can be emptied. Coerced on
  // save; a number in state makes clearing the input read as 0 decimals, which
  // silently rounds every label to an integer.
  const [value_decimals, set_value_decimals] = React.useState(
    bar_chart_options.value_decimals == null
      ? ''
      : String(bar_chart_options.value_decimals)
  )

  const text_handler = (setter) => (event) =>
    setter(event.target.value.slice(0, MAX_TEXT_LENGTH))

  const handle_value_decimals_change = (event) => {
    const next = event.target.value
    if (next === '') return set_value_decimals('')
    if (!/^\d{1,2}$/.test(next)) return
    if (Number(next) > 10) return
    set_value_decimals(next)
  }

  const handle_save = () => {
    // Start from the live prop, so a toolbar toggle flipped while the modal was
    // open is preserved rather than reverted by this write.
    const next_draft = { ...bar_chart_options }
    const set_or_delete = (key, value) => {
      if (value !== null) next_draft[key] = value
      else delete next_draft[key]
    }

    set_or_delete('custom_title', custom_title.trim() || null)
    set_or_delete('custom_subtitle', custom_subtitle.trim() || null)
    set_or_delete('custom_y_axis_title', custom_y_axis_title.trim() || null)
    set_or_delete('custom_x_axis_title', custom_x_axis_title.trim() || null)
    set_or_delete('average_line_label', average_line_label.trim() || null)
    set_or_delete(
      'value_decimals',
      value_decimals === '' ? null : Number(value_decimals)
    )

    if (JSON.stringify(next_draft) !== JSON.stringify(bar_chart_options)) {
      on_change(next_draft)
    }
    on_close()
  }

  return (
    <ChartSettingsModal
      title='Bar chart settings'
      class_name='bar-chart-settings-modal'
      on_save={handle_save}
      on_cancel={on_close}>
      <div className='modal-section'>
        <label className='modal-section-label' htmlFor='bar-custom-title-input'>
          Custom title
        </label>
        <input
          id='bar-custom-title-input'
          className='modal-text-input'
          type='text'
          maxLength={MAX_TEXT_LENGTH}
          value={custom_title}
          onChange={text_handler(set_custom_title)}
          placeholder="Leave blank to use the column's label"
        />
      </div>

      <div className='modal-section'>
        <label
          className='modal-section-label'
          htmlFor='bar-custom-subtitle-input'>
          Custom subtitle
        </label>
        <textarea
          id='bar-custom-subtitle-input'
          className='modal-textarea'
          maxLength={MAX_TEXT_LENGTH}
          value={custom_subtitle}
          onChange={text_handler(set_custom_subtitle)}
          placeholder='Leave blank for no subtitle'
          rows={2}
        />
      </div>

      <div className='modal-section'>
        <label className='modal-section-label' htmlFor='bar-value-axis-input'>
          Value axis title
        </label>
        <input
          id='bar-value-axis-input'
          className='modal-text-input'
          type='text'
          maxLength={MAX_TEXT_LENGTH}
          value={custom_y_axis_title}
          onChange={text_handler(set_custom_y_axis_title)}
          placeholder="Leave blank to use the column's label"
        />
      </div>

      <div className='modal-section'>
        <label className='modal-section-label' htmlFor='bar-subject-axis-input'>
          Subject axis title
        </label>
        <input
          id='bar-subject-axis-input'
          className='modal-text-input'
          type='text'
          maxLength={MAX_TEXT_LENGTH}
          value={custom_x_axis_title}
          onChange={text_handler(set_custom_x_axis_title)}
          placeholder='Leave blank for no title'
        />
      </div>

      <div className='modal-section'>
        <label
          className='modal-section-label'
          htmlFor='bar-average-label-input'>
          Average line label
        </label>
        <input
          id='bar-average-label-input'
          className='modal-text-input'
          type='text'
          maxLength={MAX_TEXT_LENGTH}
          value={average_line_label}
          onChange={text_handler(set_average_line_label)}
          placeholder='Average'
        />
      </div>

      <div className='modal-section'>
        <label
          className='modal-section-label'
          htmlFor='bar-value-decimals-input'>
          Decimal places
        </label>
        <input
          id='bar-value-decimals-input'
          className='modal-text-input'
          type='text'
          inputMode='numeric'
          value={value_decimals}
          onChange={handle_value_decimals_change}
          placeholder="Leave blank to derive from the data's magnitude"
        />
      </div>
    </ChartSettingsModal>
  )
}

BarChartSettingsModal.propTypes = {
  bar_chart_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  on_close: PropTypes.func.isRequired
}

// Orientation, the two label toggles, a PNG export and the settings modal.
// Deliberately smaller than the scatter plot's panel: a ranked bar has one
// metric and one ordering, so there is no axis to configure.
const BarChartSettingsPanel = ({
  bar_chart_options,
  on_change,
  on_download_png
}) => {
  const [modal_open, set_modal_open] = React.useState(false)

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
        onClick={() => set_modal_open(true)}
        title='Edit the title and axis labels'>
        Settings
      </button>
      <button
        type='button'
        className='toolbar-btn'
        onClick={on_download_png}
        title='Download chart as PNG'>
        PNG
      </button>
      {modal_open && (
        <BarChartSettingsModal
          bar_chart_options={bar_chart_options}
          on_change={on_change}
          on_close={() => set_modal_open(false)}
        />
      )}
    </div>
  )
}

BarChartSettingsPanel.propTypes = {
  bar_chart_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  on_download_png: PropTypes.func.isRequired
}

export default BarChartSettingsPanel
export { BarChartSettingsModal }
