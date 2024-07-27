import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'

import FilterBase from '../filter-base'

export default function ColumnParamSelectFilter({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {},
  mixed_state = false,
  splits = []
}) {
  const label = column_param_definition?.label || column_param_name
  const single =
    Boolean(column_param_definition?.single) &&
    !(
      column_param_definition?.enable_multi_on_split &&
      splits.some((split) =>
        column_param_definition?.enable_multi_on_split?.includes(split)
      )
    )
  const default_value = column_param_definition?.default_value
  const is_column_param_defined = Boolean(selected_param_values)
  const filter_values = []

  for (const param_value of column_param_definition?.values || []) {
    const label = param_value.label || param_value
    const value = param_value.value || param_value
    filter_values.push({
      label,
      value,
      selected: !mixed_state && (selected_param_values || []).includes(value)
    })
  }

  const [trigger_close, set_trigger_close] = useState(null)
  const count = filter_values.filter((v) => v.selected).length
  const all_selected =
    !single && (!is_column_param_defined || count === filter_values.length)
  const set_null_on_all_click = !single && !default_value

  const handle_all_click = () => {
    const values = filter_values.map((i) => i.value)
    handle_change(set_null_on_all_click ? null : values)
  }

  const handle_clear_click = () => {
    handle_change([])
  }

  const handle_select = (event, index) => {
    if (mixed_state) {
      // If in mixed state, treat as if nothing was previously selected
      if (single) {
        return handle_change([filter_values[index].value])
      } else {
        const new_values = filter_values.map((v, i) => ({
          ...v,
          selected: i === index
        }))
        const filtered_values = new_values
          .filter((i) => i.selected)
          .map((i) => i.value)
        return handle_change(filtered_values)
      }
    }

    if (single) {
      return handle_change([filter_values[index].value])
    }

    const values = filter_values.map((v, i) =>
      index === i
        ? { ...v, selected: all_selected ? false : !v.selected }
        : all_selected
        ? { ...v, selected: true }
        : v
    )
    const filtered_values = values.filter((i) => i.selected).map((i) => i.value)
    handle_change(filtered_values)
  }

  const items = filter_values.map((v, index) => {
    const class_names = ['table-filter-item-dropdown-item']
    const is_selected =
      !mixed_state &&
      (v.selected ||
        all_selected ||
        (single && !is_column_param_defined && v.value === default_value) ||
        (single && !is_column_param_defined && !default_value && index === 0))
    if (is_selected) class_names.push('selected')
    if (v.className) class_names.push(v.className)
    return (
      <div
        key={v.value}
        className={class_names.join(' ')}
        onClick={(e) => handle_select(e, index)}>
        <Checkbox checked={is_selected} size='small' />
        {v.label}
      </div>
    )
  })

  const selected_label = mixed_state
    ? '-'
    : all_selected
    ? 'ALL'
    : single && !is_column_param_defined
    ? filter_values.find((v) => v.value === default_value)?.label ||
      filter_values[0]?.label
    : filter_values
        .filter((v) => v.selected)
        .map((v) => v.label)
        .join(', ')

  const body = (
    <>
      {!single && (
        <div className='table-filter-item-dropdown-head'>
          <div className='controls-button' onClick={handle_all_click}>
            All
          </div>
          <div className='controls-button' onClick={handle_clear_click}>
            Clear
          </div>
          <div
            className='controls-button close'
            onClick={() => set_trigger_close(!trigger_close)}>
            Close
          </div>
        </div>
      )}
      <div className='table-filter-item-dropdown-body'>{items}</div>
    </>
  )

  return <FilterBase {...{ label, selected_label, body, trigger_close }} />
}

ColumnParamSelectFilter.propTypes = {
  handle_change: PropTypes.func,
  column_param_name: PropTypes.string,
  column_param_definition: PropTypes.object,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool,
  splits: PropTypes.array
}
