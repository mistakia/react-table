import React from 'react'
import PropTypes from 'prop-types'

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

  const value = getValue()
  const is_sorted = column.getIsSorted()
  return (
    <div
      {...{
        className: 'cell',
        style: {
          width: column.getSize()
        }
      }}>
      <div
        className='cell-content'
        style={{
          padding: '5px 8px 6px',
          minHeight: '32px',
          backgroundColor: is_sorted ? '#f5f5f5' : 'transparent'
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
