import React, { useMemo, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import Checkbox from '@mui/material/Checkbox'

import ColumnParamOverrideSection from '#src/column-param-override-section'
import { get_string_from_object } from '#src/utils'

import './column-param-select-filter-with-overrides.styl'

export default function ColumnParamSelectFilterWithOverrides({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change,
  column,
  column_index,
  set_local_table_state,
  row_axes = [],
  render_param_item
}) {
  const { param_override_config } = column_param_definition
  const { toggle_param, disabled_values } = param_override_config

  const [visible, set_visible] = useState(false)
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

  const is_toggle_on =
    column.selected_params?.[toggle_param] === true &&
    !disabled_values.includes(effective_value)

  // Determine selected label for the button
  const selected_label = useMemo(() => {
    const match = values.find((v) => v.value === effective_value)
    return match?.label || values[0]?.label || ''
  }, [values, effective_value])

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
            <ColumnParamOverrideSection
              param_override_config={param_override_config}
              effective_value={effective_value}
              column={column}
              column_index={column_index}
              set_local_table_state={set_local_table_state}
              row_axes={row_axes}
              render_param_item={render_param_item}
            />
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
  row_axes: PropTypes.array,
  render_param_item: PropTypes.func.isRequired
}
