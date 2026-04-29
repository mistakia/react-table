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
  const show_x_mean_line =
    scatter_plot_options.show_x_mean_line !== false
  const show_y_mean_line =
    scatter_plot_options.show_y_mean_line !== false
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

const ScatterPlotSettingsModal = ({ scatter_plot_options, on_change, on_close }) => {
  const draft = React.useRef({ ...scatter_plot_options })

  const handle_save = () => {
    if (JSON.stringify(draft.current) !== JSON.stringify(scatter_plot_options)) {
      on_change({ ...draft.current })
    }
    on_close()
  }

  const handle_cancel = () => {
    on_close()
  }

  return (
    <div className='scatter-plot-settings-modal-overlay' role='dialog' aria-modal='true' aria-label='Scatter plot settings'>
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
          {/* TODO: S11 — custom_title input */}
          <div className='modal-section'>
            <label className='modal-section-label'>Custom title</label>
            {/* TODO: S11 */}
            <p className='modal-placeholder'>Coming in S11</p>
          </div>

          {/* TODO: S11 — custom_subtitle textarea */}
          <div className='modal-section'>
            <label className='modal-section-label'>Custom subtitle</label>
            {/* TODO: S11 */}
            <p className='modal-placeholder'>Coming in S11</p>
          </div>

          {/* TODO: S8 — reference_lines table */}
          <div className='modal-section'>
            <label className='modal-section-label'>Reference lines</label>
            {/* TODO: S8 */}
            <p className='modal-placeholder'>Coming in S8</p>
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
