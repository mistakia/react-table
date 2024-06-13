import React from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'

import FilterBase from '../filter-base'

export default function ColumnParamSelectFilter({
  label,
  selected_label,
  single,
  body,
  filter_values = [],
  on_change = () => {},
  is_column_param_defined
}) {
  const count = filter_values.filter((v) => v.selected).length
  const all_selected =
    !is_column_param_defined || count === filter_values.length

  const handle_all_click = () => {
    const values = filter_values.map((i) => i.value)
    on_change(values)
  }

  const handle_clear_click = () => {
    on_change([])
  }

  const handle_select = (event, index) => {
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
    if (v.selected || all_selected) class_names.push('selected')
    if (v.className) class_names.push(v.className)
    return (
      <div
        key={v.value}
        className={class_names.join(' ')}
        onClick={(e) => handle_select(e, index)}>
        <Checkbox checked={v.selected || all_selected} size='small' />
        {v.label}
      </div>
    )
  })

  const default_selected_label = all_selected
    ? 'ALL'
    : filter_values
        .filter((v) => v.selected)
        .map((v) => v.label)
        .join(', ')

  const default_body = (
    <>
      {!single && (
        <div className='table-filter-item-dropdown-head'>
          <div
            className='table-filter-item-dropdown-action'
            onClick={handle_all_click}>
            All
          </div>
          <div
            className='table-filter-item-dropdown-action'
            onClick={handle_clear_click}>
            Clear
          </div>
        </div>
      )}
      <div className='table-filter-item-dropdown-body'>{items}</div>
    </>
  )

  return (
    <FilterBase
      label={label}
      selected_label={selected_label || default_selected_label}
      body={body || default_body}
    />
  )
}

ColumnParamSelectFilter.propTypes = {
  on_change: PropTypes.func,
  filter_values: PropTypes.array,
  single: PropTypes.bool,
  label: PropTypes.string,
  selected_label: PropTypes.string,
  body: PropTypes.node,
  is_column_param_defined: PropTypes.bool
}
