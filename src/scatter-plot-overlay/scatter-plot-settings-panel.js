import React from 'react'
import PropTypes from 'prop-types'
import ChartSettingsModal from '../chart-settings-modal'
import {
  apply_cluster_method,
  MAX_CLUSTER_COUNT,
  MIN_CLUSTER_COUNT
} from './scatter-plot-clusters.js'
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

  const handle_cluster_method = (e) => {
    on_change(
      apply_cluster_method({
        scatter_plot_options,
        cluster_method: e.target.value || null
      })
    )
  }

  const handle_cluster_count = (e) => {
    const next = { ...scatter_plot_options }
    if (e.target.value === '') delete next.cluster_count
    else next.cluster_count = Number(e.target.value)
    on_change(next)
  }

  const cluster_method = scatter_plot_options.cluster_method || ''
  const cluster_count_options = []
  for (let count = MIN_CLUSTER_COUNT; count <= MAX_CLUSTER_COUNT; count++) {
    cluster_count_options.push(count)
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
      <span className='toolbar-divider' aria-hidden='true' />
      <label className='toolbar-select-wrap' title='Point color mode'>
        <span className='toolbar-select-label'>Color</span>
        <select
          className='toolbar-select'
          value={point_color_mode}
          onChange={handle_point_color_mode}>
          <option value=''>Default</option>
          <option value='team'>Team</option>
          <option value='position'>Position</option>
          <option value='cluster'>Cluster</option>
        </select>
      </label>
      <label className='toolbar-select-wrap' title='Cluster the plotted points'>
        <span className='toolbar-select-label'>Group</span>
        <select
          className='toolbar-select'
          aria-label='Cluster method'
          value={cluster_method}
          onChange={handle_cluster_method}>
          <option value=''>Off</option>
          <option value='k_means'>Clusters</option>
          <option value='natural_breaks'>Natural tiers</option>
        </select>
      </label>
      {cluster_method && (
        <select
          className='toolbar-select'
          aria-label='Cluster count'
          title='Number of groups; Auto picks the best silhouette score'
          value={scatter_plot_options.cluster_count ?? ''}
          onChange={handle_cluster_count}>
          <option value=''>Auto</option>
          {cluster_count_options.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      )}
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
    // Keep the raw string while the user is editing so they can clear the
    // field, type a leading minus or trailing decimal, etc. The save handler
    // and chart-side plotLines filter both call isFinite() on the value, so
    // non-numeric intermediates are simply ignored downstream and the row is
    // skipped at save time.
    on_update(index, { ...line, value: e.target.value })
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
    // string while the user is mid-edit (incl. empty), number once persisted.
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
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
  on_close,
  cluster_automatic_names = []
}) => {
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
  const [custom_x_axis_title, set_custom_x_axis_title] = React.useState(
    scatter_plot_options.custom_x_axis_title || ''
  )
  const [custom_y_axis_title, set_custom_y_axis_title] = React.useState(
    scatter_plot_options.custom_y_axis_title || ''
  )
  const [font_family, set_font_family] = React.useState(
    scatter_plot_options.font_family || ''
  )
  const [natural_breaks_axis, set_natural_breaks_axis] = React.useState(
    scatter_plot_options.natural_breaks_axis || 'combined'
  )
  const [show_cluster_regions, set_show_cluster_regions] = React.useState(
    scatter_plot_options.show_cluster_regions !== false
  )
  const [show_cluster_summary, set_show_cluster_summary] = React.useState(
    scatter_plot_options.show_cluster_summary !== false
  )
  const [cluster_names, set_cluster_names] = React.useState(() =>
    cluster_automatic_names.map(
      (_, index) => scatter_plot_options.cluster_names?.[index] || ''
    )
  )
  const cluster_method = scatter_plot_options.cluster_method

  const handle_cluster_name_change = (index, value) => {
    set_cluster_names((names) =>
      names.map((name, i) => (i === index ? value.slice(0, 100) : name))
    )
  }

  const handle_custom_title_change = (e) => {
    set_custom_title(e.target.value.slice(0, 200))
  }

  const handle_ref_lines_change = (next_lines) => {
    set_ref_lines(next_lines)
  }

  const handle_custom_subtitle_change = (e) => {
    set_custom_subtitle(e.target.value.slice(0, 200))
  }

  const handle_custom_x_axis_title_change = (e) => {
    set_custom_x_axis_title(e.target.value.slice(0, 200))
  }

  const handle_custom_y_axis_title_change = (e) => {
    set_custom_y_axis_title(e.target.value.slice(0, 200))
  }

  const handle_font_family_change = (e) => {
    set_font_family(e.target.value)
  }

  const handle_save = () => {
    const valid_lines = ref_lines.filter((line) => isFinite(line.value))
    // Strip internal _key field and coerce value back to a finite number
    // (it may be a numeric string while the row is being edited).
    const normalized_lines = valid_lines.map(({ _key: _dropped, ...line }) => ({
      ...line,
      value: Number(line.value),
      label: line.label.trim().slice(0, 200)
    }))
    // Start from the live prop so toolbar-controlled fields (point_color_mode,
    // show_tier_grid, show_*_mean_line) made while the modal was open are preserved.
    const next_draft = { ...scatter_plot_options }
    const set_or_delete = (key, value) => {
      if (value !== null) next_draft[key] = value
      else delete next_draft[key]
    }
    set_or_delete(
      'reference_lines',
      normalized_lines.length > 0 ? normalized_lines : null
    )
    set_or_delete('custom_title', custom_title.trim() || null)
    set_or_delete('custom_subtitle', custom_subtitle.trim() || null)
    set_or_delete('custom_x_axis_title', custom_x_axis_title.trim() || null)
    set_or_delete('custom_y_axis_title', custom_y_axis_title.trim() || null)
    set_or_delete('font_family', font_family || null)
    if (cluster_method) {
      set_or_delete(
        'natural_breaks_axis',
        natural_breaks_axis === 'combined' ? null : natural_breaks_axis
      )
      // Both default on; write only a real change so an untouched Save stays a no-op.
      if (
        show_cluster_regions !==
        (scatter_plot_options.show_cluster_regions !== false)
      ) {
        next_draft.show_cluster_regions = show_cluster_regions
      }
      if (
        show_cluster_summary !==
        (scatter_plot_options.show_cluster_summary !== false)
      ) {
        next_draft.show_cluster_summary = show_cluster_summary
      }
      // Names are positional; keep the saved names beyond the clusters shown
      // so a temporarily smaller count does not erase them.
      const merged_names = [...(scatter_plot_options.cluster_names || [])]
      cluster_names.forEach((name, index) => {
        merged_names[index] = name.trim() || null
      })
      while (merged_names.length && !merged_names[merged_names.length - 1]) {
        merged_names.pop()
      }
      set_or_delete(
        'cluster_names',
        merged_names.length ? merged_names.map((name) => name || null) : null
      )
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
    <ChartSettingsModal
      title='Scatter plot settings'
      class_name='scatter-plot-settings-modal'
      on_save={handle_save}
      on_cancel={handle_cancel}>
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
        <label className='modal-section-label' htmlFor='custom-subtitle-input'>
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
        <label
          className='modal-section-label'
          htmlFor='custom-x-axis-title-input'>
          X axis title
        </label>
        <input
          id='custom-x-axis-title-input'
          className='modal-text-input'
          type='text'
          maxLength={200}
          value={custom_x_axis_title}
          onChange={handle_custom_x_axis_title_change}
          placeholder='Leave blank to use computed X axis title'
        />
      </div>

      <div className='modal-section'>
        <label
          className='modal-section-label'
          htmlFor='custom-y-axis-title-input'>
          Y axis title
        </label>
        <input
          id='custom-y-axis-title-input'
          className='modal-text-input'
          type='text'
          maxLength={200}
          value={custom_y_axis_title}
          onChange={handle_custom_y_axis_title_change}
          placeholder='Leave blank to use computed Y axis title'
        />
      </div>

      <div className='modal-section'>
        <label className='modal-section-label'>Reference lines</label>
        <ReferenceLinesEditor
          lines={ref_lines}
          on_lines_change={handle_ref_lines_change}
        />
      </div>

      {cluster_method && (
        <div className='modal-section'>
          <label className='modal-section-label'>Clusters</label>
          {cluster_method === 'natural_breaks' && (
            <label className='modal-inline-field'>
              <span>Tier along</span>
              <select
                className='modal-select'
                aria-label='Natural tiers axis'
                value={natural_breaks_axis}
                onChange={(e) => set_natural_breaks_axis(e.target.value)}>
                <option value='combined'>Combined X and Y</option>
                <option value='x'>X axis</option>
                <option value='y'>Y axis</option>
              </select>
            </label>
          )}
          <label className='modal-inline-field'>
            <input
              type='checkbox'
              checked={show_cluster_regions}
              onChange={(e) => set_show_cluster_regions(e.target.checked)}
            />
            <span>Show regions and centroids</span>
          </label>
          <label className='modal-inline-field'>
            <input
              type='checkbox'
              checked={show_cluster_summary}
              onChange={(e) => set_show_cluster_summary(e.target.checked)}
            />
            <span>Show summary</span>
          </label>
          {cluster_names.map((name, index) => (
            <input
              key={index}
              className='modal-text-input cluster-name-input'
              type='text'
              maxLength={100}
              aria-label={`Name for group ${index + 1}`}
              value={name}
              onChange={(e) =>
                handle_cluster_name_change(index, e.target.value)
              }
              placeholder={cluster_automatic_names[index]}
            />
          ))}
        </div>
      )}

      <div className='modal-section'>
        <label className='modal-section-label' htmlFor='font-family-select'>
          Font family
        </label>
        <select
          id='font-family-select'
          className='modal-select'
          value={font_family}
          onChange={handle_font_family_change}>
          <option value=''>Default</option>
          <option value='sans-serif'>Sans-serif</option>
          <option value='serif'>Serif</option>
          <option value='monospace'>Monospace</option>
          <option value='Helvetica, Arial'>Helvetica, Arial</option>
          <option value='Georgia'>Georgia</option>
          <option value='Courier New'>Courier New</option>
        </select>
      </div>
    </ChartSettingsModal>
  )
}

ScatterPlotSettingsModal.propTypes = {
  scatter_plot_options: PropTypes.object.isRequired,
  on_change: PropTypes.func.isRequired,
  on_close: PropTypes.func.isRequired,
  cluster_automatic_names: PropTypes.arrayOf(PropTypes.string)
}

const ScatterPlotSettingsPanel = ({
  scatter_plot_options,
  on_change,
  show_regression,
  on_toggle_regression,
  on_download_png,
  cluster_automatic_names
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
            className='toolbar-btn toolbar-action-btn'
            onClick={open_modal}
            type='button'
            title='Open settings'>
            Settings
          </button>
          <button
            className='toolbar-btn toolbar-action-btn'
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
          cluster_automatic_names={cluster_automatic_names}
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
  on_download_png: PropTypes.func.isRequired,
  cluster_automatic_names: PropTypes.arrayOf(PropTypes.string)
}

export default ScatterPlotSettingsPanel
export { ScatterPlotToolbar, ScatterPlotSettingsModal }
