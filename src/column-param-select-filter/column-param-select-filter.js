import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'

import FilterBase from '../filter-base'

export default function ColumnParamSelectFilter({
  label,
  single,
  filter_values = [],
  on_change = () => {},
  is_column_param_defined,
  default_value = null,
  mixed_state = false
}) {
  const [trigger_close, set_trigger_close] = useState(null)
  const count = filter_values.filter((v) => v.selected).length
  const all_selected =
    !single && (!is_column_param_defined || count === filter_values.length)

  const handle_all_click = () => {
    const values = filter_values.map((i) => i.value)
    on_change(values)
  }

  const handle_clear_click = () => {
    on_change([])
  }

  const handle_select = (event, index) => {
    if (mixed_state) {
      // If in mixed state, treat as if nothing was previously selected
      if (single) {
        return on_change([filter_values[index].value])
      } else {
        const new_values = filter_values.map((v, i) => ({
          ...v,
          selected: i === index
        }))
        const filtered_values = new_values
          .filter((i) => i.selected)
          .map((i) => i.value)
        return on_change(filtered_values)
      }
    }

    if (single) {
      return on_change([filter_values[index].value])
    }

    const values = filter_values.map((v, i) =>
      index === i
        ? { ...v, selected: all_selected ? false : !v.selected }
        : all_selected
        ? { ...v, selected: true }
        : v
    )
    const filtered_values = values.filter((i) => i.selected).map((i) => i.value)
    on_change(filtered_values)
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
    ? default_value || filter_values[0]?.label
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
  on_change: PropTypes.func,
  filter_values: PropTypes.array,
  single: PropTypes.bool,
  label: PropTypes.string,
  is_column_param_defined: PropTypes.bool,
  default_value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mixed_state: PropTypes.bool
}
