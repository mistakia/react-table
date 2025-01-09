import React from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'

import { get_string_from_object } from '../utils'
import FilterBase from '../filter-base'

export default function TableQuickFilter({
  column,
  table_state,
  on_table_state_change
}) {
  const column_values = column.column_values || []

  const where_param = table_state.where || []
  const where_param_index = where_param.findIndex((where_item) => {
    return where_item.column_id === column.column_id
  })
  const filter_where_param = where_param[where_param_index]

  const count =
    where_param_index > -1
      ? filter_where_param.value.length
      : column_values.length
  const all = count === column_values.length
  const selected_label = all
    ? 'ALL'
    : Array.isArray(filter_where_param.value)
      ? filter_where_param.value.join(', ')
      : filter_where_param.value

  const handleAllClick = () => {
    const new_where_param = [...where_param]
    if (where_param_index > -1) {
      new_where_param.splice(where_param_index, 1)
      on_table_state_change({
        ...table_state,
        where: new_where_param
      })
    }
  }

  const handleClearClick = () => {
    const new_where_param = [...where_param]
    if (where_param_index > -1) {
      filter_where_param.value = []
    } else {
      new_where_param.push({
        column_id: column.column_id,
        operator: 'IN',
        value: []
      })
    }

    on_table_state_change({
      ...table_state,
      where: new_where_param
    })
  }

  const handleSelect = (event, index) => {
    const value = column_values[index]
    if (column.single_select) {
      const new_where_param = [...where_param]
      if (where_param_index > -1) {
        if (filter_where_param.value === value) {
          new_where_param.splice(where_param_index, 1)
        } else {
          filter_where_param.value = value
        }
      } else {
        new_where_param.push({
          column_id: column.column_id,
          operator: '=',
          value
        })
      }
      on_table_state_change({
        ...table_state,
        where: new_where_param
      })
    } else {
      const new_where_param = [...where_param]
      if (where_param_index > -1) {
        if (filter_where_param.value.includes(value)) {
          filter_where_param.value = filter_where_param.value.filter(
            (item) => item !== value
          )
          if (filter_where_param.value.length === 0) {
            new_where_param.splice(where_param_index, 1)
          }
        } else {
          filter_where_param.value.push(value)

          if (filter_where_param.value.length === column_values.length) {
            new_where_param.splice(where_param_index, 1)
          }
        }
      } else {
        new_where_param.push({
          column_id: column.column_id,
          operator: 'IN',
          value: column_values.filter((item) => item !== value)
        })
      }
      on_table_state_change({
        ...table_state,
        where: new_where_param
      })
    }
  }

  const items = column_values.map((column_value, index) => {
    const class_object = { 'table-filter-item-dropdown-item': true }
    const is_selected = all || filter_where_param?.value?.includes(column_value)
    if (is_selected) class_object.selected = true
    return (
      <div
        key={index}
        className={get_string_from_object(class_object)}
        onClick={(e) => handleSelect(e, index)}>
        <Checkbox checked={is_selected} size='small' />
        {column_value}
      </div>
    )
  })

  const body = (
    <>
      {!column.single_select && (
        <div className='table-filter-item-dropdown-head'>
          <div
            className='table-filter-item-dropdown-action'
            onClick={handleAllClick}>
            All
          </div>
          <div
            className='table-filter-item-dropdown-action'
            onClick={handleClearClick}>
            Clear
          </div>
        </div>
      )}
      <div className='table-filter-item-dropdown-body'>{items}</div>
    </>
  )

  return (
    <FilterBase
      label={column.column_title}
      selected_label={selected_label}
      body={body}
    />
  )
}

TableQuickFilter.propTypes = {
  column: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}
