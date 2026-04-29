import React from 'react'
import PropTypes from 'prop-types'
import './scatter-plot-settings-panel.styl'

const ScatterPlotToolbar = ({
  scatter_plot_options,
  on_change,
  show_regression,
  on_toggle_regression,
  on_download_png
}) => {
  const handle_toggle = (key) => {
    on_change({ ...scatter_plot_options, [key]: !scatter_plot_options[key] })
  }

  const handle_point_color_mode = (e) => {
    const value = e.target.value
    const next = { ...scatter_plot_options }
    if (value === '') {
      delete next.point_color_mode
    } else {
      next.point_color_mode = value
    }
    on_change(next)
  }

  const show_tier_grid = Boolean(scatter_plot_options.show_tier_grid)
  const show_x_mean_line = scatter_plot_options.show_x_mean_line !== false
  const show_y_mean_line = scatter_plot_options.show_y_mean_line !== false
  const point_color_mode = scatter_plot_options.point_color_mode || ''

  return (
    <div className='scatter-plot-toolbar'>
      <button
        className={`toolbar-btn${show_regression ? ' active' : ''}`}
        onClick={on_toggle_regression}
        type='button'
        title='Toggle regression line'>
        Regression
      </button>
      <button
        className={`toolbar-btn${show_tier_grid ? ' active' : ''}`}
        onClick={() => handle_toggle('show_tier_grid')}
        type='button'
        title='Toggle tier grid'>
        Tiers
      </button>
      <select
        className='toolbar-select'
        value={point_color_mode}
        onChange={handle_point_color_mode}
        title='Point color mode'>
        <option value=''>Default color</option>
        <option value='team'>Team color</option>
        <option value='position'>Position color</option>
      </select>
      <button
        className={`toolbar-btn${show_x_mean_line ? ' active' : ''}`}
        onClick={() => handle_toggle('show_x_mean_line')}
        type='button'
        title='Toggle X mean line'>
        X mean
      </button>
      <button
        className={`toolbar-btn${show_y_mean_line ? ' active' : ''}`}
        onClick={() => handle_toggle('show_y_mean_line')}
        type='button'
        title='Toggle Y mean line'>
        Y mean
      </button>
    </div>
  )
}

ScatterPlotToolbar.propTypes = {
  scatter_plot_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  show_regression: PropTypes.bool.isRequired,
  on_toggle_regression: PropTypes.func.isRequired,
  on_download_png: PropTypes.func.isRequired
}

const DEFAULT_REFERENCE_LINE = {
  axis: 'x',
  value: 0,
  label: '',
  color: '#888888'
}

let _ref_line_counter = 0
const next_ref_line_key = () => ++_ref_line_counter

const ReferenceLineRow = ({ line, index, on_update, on_delete }) => {
  const handle_axis = (e) => on_update(index, { ...line, axis: e.target.value })
  const handle_value = (e) => {
    const parsed = parseFloat(e.target.value)
    on_update(index, { ...line, value: isNaN(parsed) ? line.value : parsed })
  }
  const handle_label = (e) =>
    on_update(index, {
      ...line,
      label: e.target.value.slice(0, 200)
    })
  const handle_color = (e) =>
    on_update(index, { ...line, color: e.target.value })

  return (
    <tr className='ref-line-row'>
      <td>
        <select
          className='ref-line-select'
          value={line.axis}
          onChange={handle_axis}>
          <option value='x'>X</option>
          <option value='y'>Y</option>
        </select>
      </td>
      <td>
        <input
          className='ref-line-input ref-line-value'
          type='number'
          step='any'
          value={line.value}
          onChange={handle_value}
        />
      </td>
      <td>
        <input
          className='ref-line-input ref-line-label'
          type='text'
          maxLength={200}
          value={line.label}
          onChange={handle_label}
          placeholder='Label'
        />
      </td>
      <td>
        <input
          className='ref-line-color'
          type='color'
          value={line.color}
          onChange={handle_color}
        />
      </td>
      <td>
        <button
          className='ref-line-delete'
          type='button'
          onClick={() => on_delete(index)}
          aria-label='Delete reference line'>
          &times;
        </button>
      </td>
    </tr>
  )
}

ReferenceLineRow.propTypes = {
  line: PropTypes.shape({
    axis: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  }).isRequired,
  index: PropTypes.number.isRequired,
  on_update: PropTypes.func.isRequired,
  on_delete: PropTypes.func.isRequired
}

const ReferenceLinesEditor = ({ lines, on_lines_change }) => {
  const handle_update = (index, updated_line) => {
    const next = lines.map((l, i) => (i === index ? updated_line : l))
    on_lines_change(next)
  }

  const handle_delete = (index) => {
    on_lines_change(lines.filter((_, i) => i !== index))
  }

  const handle_add = () => {
    on_lines_change([
      ...lines,
      { ...DEFAULT_REFERENCE_LINE, _key: next_ref_line_key() }
    ])
  }

  return (
    <div className='ref-lines-editor'>
      {lines.length > 0 && (
        <table className='ref-lines-table'>
          <thead>
            <tr>
              <th>Axis</th>
              <th>Value</th>
              <th>Label</th>
              <th>Color</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <ReferenceLineRow
                key={line._key}
                line={line}
                index={idx}
                on_update={handle_update}
                on_delete={handle_delete}
              />
            ))}
          </tbody>
        </table>
      )}
      <button className='ref-line-add-btn' type='button' onClick={handle_add}>
        + Add reference line
      </button>
    </div>
  )
}

ReferenceLinesEditor.propTypes = {
  lines: PropTypes.arrayOf(
    PropTypes.shape({
      axis: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired
    })
  ).isRequired,
  on_lines_change: PropTypes.func.isRequired
}

const ScatterPlotSettingsModal = ({
  scatter_plot_options,
  on_change,
  on_close
}) => {
  const draft = React.useRef({ ...scatter_plot_options })
  const [ref_lines, set_ref_lines] = React.useState(() =>
    (scatter_plot_options.reference_lines || []).map((l) => ({
      ...l,
      _key: next_ref_line_key()
    }))
  )
  const [custom_title, set_custom_title] = React.useState(
    scatter_plot_options.custom_title || ''
  )
  const [custom_subtitle, set_custom_subtitle] = React.useState(
    scatter_plot_options.custom_subtitle || ''
  )

  const handle_ref_lines_change = (next_lines) => {
    set_ref_lines(next_lines)
    draft.current = { ...draft.current, reference_lines: next_lines }
  }

  const handle_custom_title_change = (e) => {
    const value = e.target.value.slice(0, 200)
    set_custom_title(value)
    draft.current = {
      ...draft.current,
      custom_title: value.trim() || null
    }
  }

  const handle_custom_subtitle_change = (e) => {
    const value = e.target.value.slice(0, 200)
    set_custom_subtitle(value)
    draft.current = {
      ...draft.current,
      custom_subtitle: value.trim() || null
    }
  }

  const handle_save = () => {
    const valid_lines = ref_lines.filter((line) => isFinite(line.value))
    // Strip internal _key field before persisting
    const normalized_lines = valid_lines.map(({ _key: _dropped, ...line }) => ({
      ...line,
      label: line.label.trim().slice(0, 200)
    }))
    const next_draft = { ...draft.current }
    if (normalized_lines.length > 0) {
      next_draft.reference_lines = normalized_lines
    } else {
      delete next_draft.reference_lines
    }
    // Normalize custom_title / custom_subtitle: empty string → null
    const title_value = custom_title.trim() || null
    const subtitle_value = custom_subtitle.trim() || null
    if (title_value !== null) {
      next_draft.custom_title = title_value
    } else {
      delete next_draft.custom_title
    }
    if (subtitle_value !== null) {
      next_draft.custom_subtitle = subtitle_value
    } else {
      delete next_draft.custom_subtitle
    }
    if (JSON.stringify(next_draft) !== JSON.stringify(scatter_plot_options)) {
      on_change({ ...next_draft })
    }
    on_close()
  }

  const handle_cancel = () => {
    on_close()
  }

  return (
    <div
      className='scatter-plot-settings-modal-overlay'
      role='dialog'
      aria-modal='true'
      aria-label='Scatter plot settings'>
      <div className='scatter-plot-settings-modal'>
        <div className='modal-header'>
          <h3 className='modal-title'>Scatter plot settings</h3>
          <button
            className='modal-close-btn'
            onClick={handle_cancel}
            type='button'
            aria-label='Close settings'>
            &times;
          </button>
        </div>
        <div className='modal-body'>
          <div className='modal-section'>
            <label className='modal-section-label' htmlFor='custom-title-input'>
              Custom title
            </label>
            <input
              id='custom-title-input'
              className='modal-text-input'
              type='text'
              maxLength={200}
              value={custom_title}
              onChange={handle_custom_title_change}
              placeholder='Leave blank to use computed title'
            />
          </div>

          <div className='modal-section'>
            <label
              className='modal-section-label'
              htmlFor='custom-subtitle-input'>
              Custom subtitle
            </label>
            <textarea
              id='custom-subtitle-input'
              className='modal-textarea'
              maxLength={200}
              value={custom_subtitle}
              onChange={handle_custom_subtitle_change}
              placeholder='Leave blank to use computed subtitle'
              rows={3}
            />
          </div>

          <div className='modal-section'>
            <label className='modal-section-label'>Reference lines</label>
            <ReferenceLinesEditor
              lines={ref_lines}
              on_lines_change={handle_ref_lines_change}
            />
          </div>

          {/* TODO: S12 — font_family dropdown */}
          <div className='modal-section'>
            <label className='modal-section-label'>Font family</label>
            {/* TODO: S12 */}
            <p className='modal-placeholder'>Coming in S12</p>
          </div>
        </div>
        <div className='modal-footer'>
          <button
            className='modal-btn modal-btn-cancel'
            onClick={handle_cancel}
            type='button'>
            Cancel
          </button>
          <button
            className='modal-btn modal-btn-save'
            onClick={handle_save}
            type='button'>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

ScatterPlotSettingsModal.propTypes = {
  scatter_plot_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  on_close: PropTypes.func.isRequired
}

const ScatterPlotSettingsPanel = ({
  scatter_plot_options,
  on_change,
  show_regression,
  on_toggle_regression,
  on_download_png
}) => {
  const [modal_open, set_modal_open] = React.useState(false)

  const open_modal = () => set_modal_open(true)
  const close_modal = () => set_modal_open(false)

  return (
    <div className='scatter-plot-settings-panel'>
      <div className='scatter-plot-settings-row'>
        <ScatterPlotToolbar
          scatter_plot_options={scatter_plot_options}
          on_change={on_change}
          show_regression={show_regression}
          on_toggle_regression={on_toggle_regression}
          on_download_png={on_download_png}
        />
        <div className='toolbar-actions'>
          <button
            className='toolbar-btn'
            onClick={open_modal}
            type='button'
            title='Open settings'>
            Settings...
          </button>
          <button
            className='toolbar-btn'
            onClick={on_download_png}
            type='button'
            title='Download chart as PNG'>
            Download PNG
          </button>
        </div>
      </div>
      {modal_open && (
        <ScatterPlotSettingsModal
          scatter_plot_options={scatter_plot_options}
          on_change={on_change}
          on_close={close_modal}
        />
      )}
    </div>
  )
}

ScatterPlotSettingsPanel.propTypes = {
  scatter_plot_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  show_regression: PropTypes.bool.isRequired,
  on_toggle_regression: PropTypes.func.isRequired,
  on_download_png: PropTypes.func.isRequired
}

export default ScatterPlotSettingsPanel
export { ScatterPlotToolbar, ScatterPlotSettingsModal }
