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

import { get_string_from_object } from '#src/utils'
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
  const container_ref = useRef(null)
  const [transform, set_transform] = useState('')
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

  useEffect(() => {
    if (row_axes_controls_open) {
      if (container_ref.current) {
        const original_rect = container_ref.current.getBoundingClientRect()
        const scroll_left =
          window.pageXOffset || document.documentElement.scrollLeft
        const window_center_x = window.innerWidth / 2 + scroll_left
        const element_width =
          window.innerWidth < 768 ? 0.9 * window.innerWidth : 200
        const element_center_x =
          original_rect.left + element_width / 2 + scroll_left

        const translate_x = window_center_x - element_center_x

        set_transform(`translateX(${translate_x}px)`)
      }
    } else {
      set_transform('')
    }
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
    const items = table_state_columns.flatMap((column) => column.row_axes).filter(Boolean)
    return [...new Set(items)]
  }, [table_state_columns])

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        ref={container_ref}
        style={{ transform }}
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
        {row_axes_controls_open && (
          supported_row_axes.length ? (
            <div className='table-expanding-control-input-container'>
              <Autocomplete
                multiple
                options={supported_row_axes}
                disableCloseOnSelect
                value={local_table_state.row_axes}
                openOnFocus
                getOptionLabel={(option) => option}
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
            </div>
          ) : (
            <div className='table-row-axes-controls-no-row-axes'>
              <Alert severity='info'>
                {no_row_axes_available_label}
              </Alert>
            </div>
          )
        )}
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
