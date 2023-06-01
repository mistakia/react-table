import React from 'react'
import PropTypes from 'prop-types'
import copy from 'copy-text-to-clipboard'

import { get_string_from_object } from '../utils'

export default function TableCell({ getValue, column, row }) {
  if (column.columnDef.id === 'add_column_action') {
    return null
  }

  if (column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content'>{row.index + 1}</div>
      </div>
    )
  }

  const is_sorted = column.getIsSorted()

  if (column.columnDef.component) {
    const Component = column.columnDef.component
    return (
      <div
        {...{
          className: get_string_from_object({
            cell: true,
            sorted: is_sorted
          }),
          style: {
            width: column.getSize()
          }
        }}>
        <Component {...{ row, column }} />
      </div>
    )
  }

  let value = getValue()
  if (value !== undefined && value !== null && typeof value === 'object') {
    value = 'invalid value'
  }

  const handle_click = () => {
    if (value !== undefined && value !== null) {
      copy(`${value}`)
      console.log('copied to clipboard:', value)
    }
  }

  const is_grouped = Boolean(column.parent?.columns.length)
  const is_group_end =
    is_grouped &&
    column.parent.columns[column.parent.columns.length - 1].id === column.id

  return (
    <div
      {...{
        className: get_string_from_object({
          cell: true,
          sorted: is_sorted,
          group_end: is_group_end
        }),
        style: {
          width: column.getSize()
        },
        onClick: handle_click
      }}>
      <div
        className='cell-content'
        style={{
          padding: '5px 8px 6px',
          minHeight: '32px'
        }}>
        {value}
      </div>
    </div>
  )
}

TableCell.propTypes = {
  getValue: PropTypes.func,
  column: PropTypes.object,
  row: PropTypes.object
}
