import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/material'
import { get_string_from_object } from '../utils'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import Alert from '@mui/material/Alert'

import { MENU_CLOSE_TIMEOUT } from '../constants.mjs'

import './table-splits-controls.styl'

const icon = <CheckBoxOutlineBlankIcon fontSize='small' />
const checkedIcon = <CheckBoxIcon fontSize='small' />

const TableSplitsControls = ({
  table_state,
  on_table_state_change,
  table_state_columns
}) => {
  const [splits_controls_open, set_splits_controls_open] = useState(false)
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
    if (splits_controls_open && !was_menu_open.current) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          setTimeout(() => {
            if (filter_input_ref.current) filter_input_ref.current.focus()
          }, 400)
        } else if (filter_input_ref.current) {
          filter_input_ref.current.focus()
        }
      }, 300)
    } else if (!splits_controls_open && was_menu_open.current) {
      if (filter_input_ref.current) {
        filter_input_ref.current.blur()
      }
    }

    was_menu_open.current = splits_controls_open
  }, [splits_controls_open])

  useEffect(() => {
    if (splits_controls_open) {
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
  }, [splits_controls_open])

  const handle_menu_toggle = useCallback(() => {
    if (splits_controls_open) {
      set_closing(true)
      set_splits_controls_open(false)

      setTimeout(() => {
        set_closing(false)
      }, MENU_CLOSE_TIMEOUT)
    } else {
      set_splits_controls_open(true)
    }
  }, [splits_controls_open])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && splits_controls_open) {
        handle_menu_toggle()
      }
    }

    if (splits_controls_open) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [splits_controls_open, handle_menu_toggle])

  const handle_click_away = useCallback(
    (event) => {
      if (splits_controls_open) {
        set_closing(true)
        set_splits_controls_open(false)

        setTimeout(() => {
          set_closing(false)
        }, MENU_CLOSE_TIMEOUT)
      }
    },
    [splits_controls_open]
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

  const supported_splits = useMemo(() => {
    const items = table_state_columns
      .map((column) => column.splits)
      .flat()
      .filter(Boolean)
    return [...new Set(items)]
  }, [table_state_columns])

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        ref={container_ref}
        style={{ transform }}
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'table-splits-controls': true,
          '-open': splits_controls_open,
          '-closing': closing
        })}
        tabIndex={0}>
        <div
          onClick={handle_menu_toggle}
          className='table-expanding-control-button'>
          <CallSplitIcon />
          Splits
        </div>
        {splits_controls_open && is_local_table_state_changed && (
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
        {splits_controls_open && (
          <div className='table-expanding-control-input-container'>
            <Autocomplete
              multiple
              options={supported_splits}
              disableCloseOnSelect
              value={local_table_state.splits}
              openOnFocus
              getOptionLabel={(option) => option}
              onChange={(event, new_value) => {
                set_local_table_state((prev_table_state) => ({
                  ...prev_table_state,
                  splits: new_value
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
                  label='Splits'
                  inputRef={filter_input_ref}
                />
              )}
            />
          </div>
        )}
        {splits_controls_open && !supported_splits.length && (
          <div className='table-splits-controls-no-splits'>
            <Alert severity='info'>
              No splits available for selected columns
            </Alert>
          </div>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableSplitsControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  table_state_columns: PropTypes.array.isRequired
}

export default React.memo(TableSplitsControls)
