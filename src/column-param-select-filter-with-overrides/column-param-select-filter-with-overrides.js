import React, { useMemo, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'

import ColumnControlsColumnParamItem from '#src/column-controls-column-param-item'
import {
  fuzzy_match,
  group_parameters,
  get_string_from_object
} from '#src/utils'

import './column-param-select-filter-with-overrides.styl'

export default function ColumnParamSelectFilterWithOverrides({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change,
  column,
  column_index,
  set_local_table_state,
  splits = []
}) {
  const { param_override_config } = column_param_definition
  const {
    label: override_label,
    toggle_param,
    override_param,
    disabled_values,
    overridable_param_filter
  } = param_override_config

  const [visible, set_visible] = useState(false)
  const [filter_text, set_filter_text] = useState('')
  const button_ref = useRef()

  const label = column_param_definition?.label || column_param_name
  const default_value = column_param_definition?.default_value
  const values = column_param_definition?.values || []

  // Resolve current selected value
  const current_value = Array.isArray(selected_param_values)
    ? selected_param_values[0]
    : selected_param_values
  const effective_value =
    current_value !== undefined ? current_value : default_value

  const is_toggle_disabled = disabled_values.includes(effective_value)
  const is_toggle_on =
    column.selected_params?.[toggle_param] === true && !is_toggle_disabled

  // Determine selected label for the button
  const selected_label = useMemo(() => {
    const match = values.find((v) => v.value === effective_value)
    return match?.label || values[0]?.label || ''
  }, [values, effective_value])

  // Determine overridable params
  const overridable_params = useMemo(() => {
    if (!column.column_params) return {}
    const { exclude_groups, exclude_param_names } = overridable_param_filter
    const result = {}
    for (const [name, definition] of Object.entries(column.column_params)) {
      if (exclude_param_names.includes(name)) continue
      if (definition.hidden) continue
      const groups = definition.groups || []
      if (
        groups.length > 0 &&
        groups.every((g) => exclude_groups.includes(g))
      ) {
        continue
      }
      result[name] = definition
    }
    return result
  }, [column.column_params, overridable_param_filter])

  // Filter and group override params
  const filtered_override_params = useMemo(() => {
    const entries = Object.entries(overridable_params)
    if (!filter_text) return entries
    return entries.filter(([name]) => fuzzy_match(filter_text, name))
  }, [overridable_params, filter_text])

  const grouped_override_params = useMemo(() => {
    return group_parameters(Object.fromEntries(filtered_override_params))
  }, [filtered_override_params])

  // Virtual column for override param controls
  const override_column = useMemo(
    () => ({
      ...column,
      selected_params: column.selected_params?.[override_param] || {}
    }),
    [column, override_param]
  )

  // Click-away handler that ignores clicks inside nested Poppers
  const handle_click_away = useCallback((event) => {
    if (event.target.closest('.table-popper')) return
    set_visible(false)
  }, [])

  // Select item handler
  const handle_select_item = useCallback(
    (value) => {
      handle_change([value])
    },
    [handle_change]
  )

  // Toggle handler
  const handle_toggle_change = useCallback(
    (event) => {
      const new_toggle_value = event.target.checked
      const current_params = column.selected_params || {}

      const new_params = {
        ...current_params,
        [toggle_param]: new_toggle_value
      }

      if (new_toggle_value) {
        const inherited = {}
        for (const param_name of Object.keys(overridable_params)) {
          if (current_params[param_name] !== undefined) {
            inherited[param_name] = current_params[param_name]
          }
        }
        new_params[override_param] = inherited
      } else {
        delete new_params[override_param]
      }

      const new_column = { column_id: column.column_id, params: new_params }
      set_local_table_state((prev_state) => ({
        ...prev_state,
        columns: [
          ...prev_state.columns.slice(0, column_index),
          new_column,
          ...prev_state.columns.slice(column_index + 1)
        ]
      }))
    },
    [
      column,
      column_index,
      set_local_table_state,
      toggle_param,
      override_param,
      overridable_params
    ]
  )

  // Clear handler
  const handle_clear = useCallback(() => {
    const current_params = column.selected_params || {}
    const new_params = { ...current_params, [override_param]: {} }
    const new_column = { column_id: column.column_id, params: new_params }
    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: [
        ...prev_state.columns.slice(0, column_index),
        new_column,
        ...prev_state.columns.slice(column_index + 1)
      ]
    }))
  }, [column, column_index, set_local_table_state, override_param])

  // State interceptor for override param changes
  const handle_override_state_change = useCallback(
    (updater) => {
      set_local_table_state((prev_state) => {
        const next_state =
          typeof updater === 'function' ? updater(prev_state) : updater
        const updated_column = next_state.columns[column_index]
        const current_column = prev_state.columns[column_index]
        const current_params =
          typeof current_column === 'string' ? {} : current_column.params || {}

        return {
          ...prev_state,
          columns: [
            ...prev_state.columns.slice(0, column_index),
            {
              column_id: updated_column.column_id,
              params: {
                ...current_params,
                [override_param]: updated_column.params || {}
              }
            },
            ...prev_state.columns.slice(column_index + 1)
          ]
        }
      })
    },
    [set_local_table_state, column_index, override_param]
  )

  // Build select items
  const select_items = values.map((v) => {
    const value = v.value !== undefined ? v.value : v
    const item_label = v.label || v
    const is_selected = value === effective_value
    const class_names = ['table-filter-item-dropdown-item']
    if (is_selected) class_names.push('selected')

    return (
      <div
        key={String(value)}
        className={class_names.join(' ')}
        onClick={() => handle_select_item(value)}>
        <Checkbox checked={is_selected} size='small' />
        <div className='table-filter-item-dropdown-item-label'>
          {item_label}
        </div>
        {value === default_value && (
          <div className='table-filter-item-dropdown-item-tag'>Default</div>
        )}
      </div>
    )
  })

  const panel_class_name = get_string_from_object({
    'select-filter-with-overrides-panel': true,
    'overrides-active': is_toggle_on
  })

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div>
        <div
          className='table-filter-item'
          onClick={() => set_visible(!visible)}
          ref={button_ref}>
          <div className='table-filter-item-label'>{label}</div>
          <div className='table-filter-item-selection'>{selected_label}</div>
        </div>
        <Popper
          open={visible}
          anchorEl={button_ref.current}
          placement='bottom-start'
          className='table-filter-item-dropdown table-popper'>
          <div className={panel_class_name}>
            <div className='select-options-section'>{select_items}</div>
            <div className='override-section'>
              <div className='override-header'>
                <div className='override-label'>{override_label}</div>
                {is_toggle_on && (
                  <div className='controls-button' onClick={handle_clear}>
                    Clear
                  </div>
                )}
                <Switch
                  size='small'
                  checked={is_toggle_on}
                  onChange={handle_toggle_change}
                  disabled={is_toggle_disabled}
                />
              </div>
              {is_toggle_on && (
                <div className='override-params-body'>
                  <div style={{ padding: '0 8px 8px' }}>
                    <TextField
                      variant='outlined'
                      margin='none'
                      fullWidth
                      label='Search parameters'
                      size='small'
                      autoComplete='off'
                      value={filter_text}
                      onChange={(e) => set_filter_text(e.target.value)}
                    />
                  </div>
                  <div className='override-params-container'>
                    {Object.entries(grouped_override_params).map(
                      ([group_name, params]) => (
                        <div key={group_name} className='column-param-group'>
                          {group_name !== 'Ungrouped' && (
                            <div className='column-param-group-title'>
                              {group_name}
                            </div>
                          )}
                          {params.map(
                            ([column_param_name, column_param_definition]) => (
                              <ColumnControlsColumnParamItem
                                key={column_param_name}
                                column={override_column}
                                set_local_table_state={
                                  handle_override_state_change
                                }
                                column_index={column_index}
                                column_param_name={column_param_name}
                                column_param_definition={
                                  column_param_definition
                                }
                                splits={splits}
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

ColumnParamSelectFilterWithOverrides.displayName =
  'ColumnParamSelectFilterWithOverrides'
ColumnParamSelectFilterWithOverrides.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_param_values: PropTypes.array,
  handle_change: PropTypes.func.isRequired,
  column: PropTypes.object.isRequired,
  column_index: PropTypes.number.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  splits: PropTypes.array
}
