import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import ClickAwayListener from '@mui/base/ClickAwayListener'
import { Popper } from '@mui/base/Popper'
import Checkbox from '@mui/material/Checkbox'

import './table-filter.styl'

export default function TableFilter({
  column,
  table_state,
  on_table_state_change
}) {
  const selected_label = null // TODO
  const body = null // TODO
  const column_values = column.column_values || []
  const [popper_open, set_popper_open] = useState(false)
  const button_ref = useRef()

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
  const default_selected_label = all
    ? 'ALL'
    : filter_where_param.value.join(', ')

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
    const classNames = ['filter-dropdown-item']
    const is_selected = all || filter_where_param?.value?.includes(column_value)
    if (is_selected) classNames.push('selected')
    return (
      <div
        key={index}
        className={classNames.join(' ')}
        onClick={(e) => handleSelect(e, index)}>
        <Checkbox checked={is_selected} size='small' />
        <div className='dropdown__item-label'>{column_value}</div>
      </div>
    )
  })

  const default_body = (
    <>
      {!column.single_select && (
        <div className='filter-dropdown-head'>
          <div className='filter-dropdown-action' onClick={handleAllClick}>
            All
          </div>
          <div className='filter-dropdown-action' onClick={handleClearClick}>
            Clear
          </div>
        </div>
      )}
      <div className='filter-dropdown-body'>{items}</div>
    </>
  )

  const popper_modifiers = [
    {
      name: 'offset',
      options: {
        offset: [0, 8]
      }
    }
  ]

  return (
    <>
      <ClickAwayListener onClickAway={() => set_popper_open(false)}>
        <div>
          <div
            className='filter'
            onClick={() => set_popper_open(!popper_open)}
            ref={button_ref}>
            <div className='filter-label'>{column.column_title}</div>
            <div className='filter-selection'>
              {selected_label || default_selected_label}
            </div>
          </div>
          <Popper
            open={popper_open}
            anchorEl={button_ref.current}
            placement='bottom-start'
            modifiers={popper_modifiers}>
            <div className='filter-dropdown'>{body || default_body}</div>
          </Popper>
        </div>
      </ClickAwayListener>
    </>
  )
}

TableFilter.propTypes = {
  column: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}
