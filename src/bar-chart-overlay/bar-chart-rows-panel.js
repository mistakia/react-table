import React from 'react'
import PropTypes from 'prop-types'
import { DEFAULT_BAR_CHART_ROW_LIMIT } from './bar-chart-data.js'

// Matches the published schema's maximum. A larger value is not refused by the
// chart, it is refused by validate_table_state on save, which surfaces as a
// view that will not persist rather than as a rejected field.
export const MAX_ROW_LIMIT = 1000

// The presets a reader actually reaches for on a ranked chart, plus All. Not a
// free-text-only field: the whole point of this panel is that someone staring
// at a truncated chart can fix it in one click, and typing a number is three
// interactions and a decision about which number.
const ROW_LIMIT_PRESETS = [10, 25, 40, 100]

// Which rows the chart draws, in the toolbar rather than behind the settings
// modal. The modal is for things you set once and forget -- titles, axis
// labels, decimal places. How much of the ranking is on screen is the opposite:
// it is the question the chart itself raises the moment it truncates, so the
// control belongs one click from the chart, next to the scope line that says it
// truncated.
const BarChartRowsPanel = ({
  bar_chart_options,
  row_count,
  total_row_count,
  on_change
}) => {
  const [is_open, set_is_open] = React.useState(false)
  const container_ref = React.useRef(null)

  const row_limit = bar_chart_options.row_limit
  const rank_window =
    bar_chart_options.rank_window === 'bottom' ? 'bottom' : 'top'
  const is_truncated = row_count < total_row_count

  // Presets highlight against the EFFECTIVE limit, not the stored field. On a
  // default chart the field is absent, so comparing against it left every
  // preset unselected while the panel's own readout said the chart was drawing
  // forty -- the control disagreeing with the sentence above it. Whether the
  // forty is chosen or inherited is what the reset link says, not the preset.
  const effective_limit =
    row_limit === null
      ? null
      : Number.isInteger(row_limit) && row_limit > 0
        ? row_limit
        : DEFAULT_BAR_CHART_ROW_LIMIT

  const [draft_limit, set_draft_limit] = React.useState('')
  React.useEffect(() => {
    if (!is_open) return
    // Seeded from the EFFECTIVE count, not from the stored field, so a chart
    // running on the default opens showing the number it is actually drawing
    // rather than an empty box that reads as "no limit set".
    set_draft_limit(row_limit === null ? '' : String(row_count))
  }, [is_open, row_limit, row_count])

  const close = React.useCallback(() => set_is_open(false), [])

  // Escape closes THIS panel and stops there. The overlay closes the whole
  // chart on a document-level Escape, so without the capture-phase guard the
  // key dismisses the chart out from under an open panel -- the same defect
  // the settings modal already carries a fix for, and it does not transfer,
  // because each popover has to stop the key itself.
  React.useEffect(() => {
    if (!is_open) return
    const handle_key_down = (event) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      close()
    }
    document.addEventListener('keydown', handle_key_down, true)
    return () => document.removeEventListener('keydown', handle_key_down, true)
  }, [is_open, close])

  React.useEffect(() => {
    if (!is_open) return
    const handle_pointer_down = (event) => {
      if (container_ref.current?.contains(event.target)) return
      close()
    }
    // Capture again, and for the same reason: the overlay closes the chart on
    // a backdrop mousedown, so a bubble-phase handler here would run after the
    // chart had already gone.
    document.addEventListener('mousedown', handle_pointer_down, true)
    return () =>
      document.removeEventListener('mousedown', handle_pointer_down, true)
  }, [is_open, close])

  // Deletes rather than assigning undefined. A key present with an undefined
  // value survives the spread, and the options schema is additionalProperties
  // false with a typed `rank_window`, so it fails validation on save -- which
  // surfaces as a view that will not persist, not as a rejected field.
  const set_rank_window = (next) => {
    const draft = { ...bar_chart_options }
    if (next === 'bottom') draft.rank_window = 'bottom'
    else delete draft.rank_window
    on_change(draft)
  }

  const set_limit = (next) => {
    const draft = { ...bar_chart_options }
    // Absence is the DEFAULT and null is "all", so the default has to be
    // written by deleting the key. Writing the default's number instead would
    // pin the view to today's constant and leave it behind if it ever moves.
    if (next === 'default') delete draft.row_limit
    else draft.row_limit = next
    on_change(draft)
  }

  const handle_draft_change = (event) => {
    const next = event.target.value
    if (next === '') return set_draft_limit('')
    if (!/^\d{1,4}$/.test(next)) return
    if (Number(next) < 1 || Number(next) > MAX_ROW_LIMIT) return
    set_draft_limit(next)
    set_limit(Number(next))
  }

  const button_label = is_truncated
    ? `Rows: ${row_count} of ${total_row_count}`
    : `Rows: ${row_count}`

  return (
    <div className='bar-chart-rows' ref={container_ref}>
      <button
        type='button'
        className={`toolbar-btn${is_open ? ' active' : ''}`}
        aria-expanded={is_open}
        aria-haspopup='true'
        onClick={() => set_is_open((open) => !open)}
        title='Choose how much of the ranking the chart draws'>
        {button_label}
      </button>
      {is_open && (
        <div className='bar-chart-rows-popover' role='group' aria-label='Rows'>
          <p className='bar-chart-rows-readout'>
            {is_truncated
              ? `Drawing ${rank_window === 'bottom' ? 'the lowest' : 'the highest'} ${row_count} of ${total_row_count} rows.`
              : `Drawing all ${total_row_count} rows.`}
          </p>

          <div className='bar-chart-rows-field'>
            <span className='bar-chart-rows-label'>Bars to draw</span>
            <div className='bar-chart-rows-presets'>
              {ROW_LIMIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type='button'
                  className={`toolbar-btn${effective_limit === preset ? ' active' : ''}`}
                  onClick={() => set_limit(preset)}>
                  {preset}
                </button>
              ))}
              <button
                type='button'
                className={`toolbar-btn${effective_limit === null ? ' active' : ''}`}
                onClick={() => set_limit(null)}
                title='Draw every row the view returned'>
                All
              </button>
            </div>
            <input
              id='bar-row-limit-input'
              className='bar-chart-rows-input'
              type='text'
              inputMode='numeric'
              value={draft_limit}
              onChange={handle_draft_change}
              placeholder='Custom'
              aria-label='Bars to draw'
            />
          </div>

          <div className='bar-chart-rows-field'>
            <span className='bar-chart-rows-label'>From</span>
            <div className='bar-chart-segmented'>
              <button
                type='button'
                className={`toolbar-btn${rank_window === 'top' ? ' active' : ''}`}
                // 'top' is the default, so it is written as ABSENCE. Persisting
                // the default would make every saved view carry a field it
                // never chose, and a later change of default could not reach it.
                onClick={() => set_rank_window('top')}>
                Top
              </button>
              <button
                type='button'
                className={`toolbar-btn${rank_window === 'bottom' ? ' active' : ''}`}
                onClick={() => set_rank_window('bottom')}>
                Bottom
              </button>
            </div>
          </div>

          {row_limit !== undefined && (
            <button
              type='button'
              className='bar-chart-rows-reset'
              onClick={() => set_limit('default')}>
              Reset to {DEFAULT_BAR_CHART_ROW_LIMIT}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

BarChartRowsPanel.propTypes = {
  bar_chart_options: PropTypes.object.isRequired,
  row_count: PropTypes.number.isRequired,
  total_row_count: PropTypes.number.isRequired,
  on_change: PropTypes.func.isRequired
}

export default BarChartRowsPanel
