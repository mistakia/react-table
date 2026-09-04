import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import Alert from '@mui/material/Alert'

import {
  get_string_from_object,
  use_expanding_control_anchor
} from '#src/utils'
import resolve_row_axis_conflicts from '#src/utils/resolve-row-axis-conflicts.js'
import { MENU_CLOSE_TIMEOUT } from '#src/constants.mjs'

import './table-row-axes-controls.styl'

const icon = <CheckBoxOutlineBlankIcon fontSize='small' />
const checkedIcon = <CheckBoxIcon fontSize='small' />

const TableRowAxesControls = ({
  table_state,
  on_table_state_change,
  table_state_columns,
  row_axes_label = 'Row axes',
  no_row_axes_available_label = 'No row axes available for selected columns'
}) => {
  const [row_axes_controls_open, set_row_axes_controls_open] = useState(false)
  const [local_table_state, set_local_table_state] = useState(table_state)
  const [closing, set_closing] = useState(false)
  const filter_input_ref = useRef(null)

  // Kept in sync with the `-open` width in table-row-axes-controls.styl.
  const open_width = useMemo(() => {
    const viewport_width = typeof window === 'undefined' ? 0 : window.innerWidth
    return viewport_width < 768 ? 0.9 * viewport_width : 200
  }, [])

  const { container_ref, anchor_style } = use_expanding_control_anchor({
    is_open: row_axes_controls_open,
    is_closing: closing,
    open_width
  })

  // update local_table_state on table_state change
  useEffect(() => {
    set_local_table_state(table_state)
  }, [table_state])

  const was_menu_open = useRef(false)

  useEffect(() => {
    if (row_axes_controls_open && !was_menu_open.current) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          setTimeout(() => {
            if (filter_input_ref.current) filter_input_ref.current.focus()
          }, 400)
        } else if (filter_input_ref.current) {
          filter_input_ref.current.focus()
        }
      }, 300)
    } else if (!row_axes_controls_open && was_menu_open.current) {
      if (filter_input_ref.current) {
        filter_input_ref.current.blur()
      }
    }

    was_menu_open.current = row_axes_controls_open
  }, [row_axes_controls_open])

  const handle_close = useCallback(() => {
    set_closing(true)
    set_row_axes_controls_open(false)
    setTimeout(() => {
      set_closing(false)
    }, MENU_CLOSE_TIMEOUT)
  }, [])

  const handle_menu_toggle = useCallback(() => {
    if (row_axes_controls_open) {
      handle_close()
    } else {
      set_row_axes_controls_open(true)
    }
  }, [row_axes_controls_open, handle_close])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && row_axes_controls_open) {
        handle_close()
      }
    }

    if (row_axes_controls_open) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [row_axes_controls_open, handle_close])

  const handle_click_away = useCallback(
    (event) => {
      if (row_axes_controls_open) {
        handle_close()
      }
    },
    [row_axes_controls_open, handle_close]
  )

  const handle_apply = useCallback(() => {
    on_table_state_change(local_table_state)
  }, [local_table_state, on_table_state_change])

  const handle_discard = useCallback(() => {
    set_local_table_state(table_state)
  }, [table_state])

  const is_local_table_state_changed = useMemo(() => {
    return JSON.stringify(local_table_state) !== JSON.stringify(table_state)
  }, [local_table_state, table_state])

  const supported_row_axes = useMemo(() => {
    const items = table_state_columns
      .flatMap((column) => column.row_axes)
      .filter(Boolean)
    return [...new Set(items)]
  }, [table_state_columns])

  // An axis the selected columns offer but cannot SHARE, because they key its
  // rows on different quantities. The option stays in the list and stays
  // deselectable by its chip -- what changes is that it can no longer be turned
  // ON, and that the panel says which columns disagree. Removing it from
  // `supported_row_axes` instead would hide the one fact the user needs.
  const row_axis_conflicts = useMemo(
    () => resolve_row_axis_conflicts({ table_state_columns }),
    [table_state_columns]
  )

  const column_title_of = useCallback(
    (column_id) =>
      table_state_columns.find((column) => column.column_id === column_id)
        ?.column_title || column_id,
    [table_state_columns]
  )

  // Only for an axis the user currently has ON: a conflict on an axis nobody
  // selected is a combination they have not asked for, and the disabled option
  // already says so without spending the panel on it.
  const active_row_axis_conflicts = useMemo(
    () =>
      (local_table_state.row_axes || []).filter(
        (axis) => row_axis_conflicts[axis]
      ),
    [local_table_state.row_axes, row_axis_conflicts]
  )

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        ref={container_ref}
        style={anchor_style || undefined}
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'table-row-axes-controls': true,
          '-open': row_axes_controls_open,
          '-closing': closing
        })}
        tabIndex={0}>
        <div
          onClick={handle_menu_toggle}
          className='table-expanding-control-button'>
          <CallSplitIcon />
          {row_axes_label}
        </div>
        {row_axes_controls_open && is_local_table_state_changed && (
          <div className='table-control-container-state-buttons'>
            <div
              className='controls-button controls-discard'
              onClick={handle_discard}>
              Discard
            </div>
            <div
              className='controls-button controls-apply'
              onClick={handle_apply}>
              Apply
            </div>
          </div>
        )}
        {row_axes_controls_open &&
          (supported_row_axes.length ? (
            <div className='table-expanding-control-input-container'>
              <Autocomplete
                multiple
                options={supported_row_axes}
                disableCloseOnSelect
                value={local_table_state.row_axes}
                openOnFocus
                getOptionLabel={(option) => option}
                getOptionDisabled={(option) =>
                  Boolean(row_axis_conflicts[option]) &&
                  !(local_table_state.row_axes || []).includes(option)
                }
                onChange={(event, new_value) => {
                  set_local_table_state((prev_table_state) => ({
                    ...prev_table_state,
                    row_axes: new_value
                  }))
                }}
                renderOption={(props, option, { selected }) => {
                  // eslint-disable-next-line react/prop-types
                  const { key, ...optionProps } = props
                  return (
                    <li key={key} {...optionProps}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option}
                    </li>
                  )
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={row_axes_label}
                    inputRef={filter_input_ref}
                  />
                )}
              />
              {active_row_axis_conflicts.map((axis) => (
                <Alert
                  key={axis}
                  severity='warning'
                  className='table-row-axes-controls-conflict'>
                  <div>
                    {`These columns cannot share the ${axis} split, because its rows are keyed on a value and they do not measure the same thing:`}
                  </div>
                  <ul>
                    {row_axis_conflicts[axis].groups.map((group) => (
                      <li key={group.domain}>
                        {`${group.column_ids
                          .map(column_title_of)
                          .join(', ')} — ${group.domain}`}
                      </li>
                    ))}
                  </ul>
                  <div>
                    Remove the columns on one side, or put each group in its own
                    view.
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <div className='table-row-axes-controls-no-row-axes'>
              <Alert severity='info'>{no_row_axes_available_label}</Alert>
            </div>
          ))}
      </div>
    </ClickAwayListener>
  )
}

TableRowAxesControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  table_state_columns: PropTypes.array.isRequired,
  row_axes_label: PropTypes.string,
  no_row_axes_available_label: PropTypes.string
}

export default React.memo(TableRowAxesControls)
