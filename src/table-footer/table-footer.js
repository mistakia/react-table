import React from 'react'
import PropTypes from 'prop-types'

const TableFooter = ({ column, header, width }) => {
  const is_group_header = header.column.columns.length

  if (is_group_header) {
    return null
  }

  if (column.columnDef.id === 'add_column_action') {
    return null
  }

  if (column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content' />
      </div>
    )
  }

  return (
    <div
      {...{
        className: 'cell',
        style: {
          width
        }
      }}>
      <div className='cell-content'>
        <div style={{ display: 'flex ', alignItems: 'center', height: '100%' }}>
          {column.columnDef.footer_label}
        </div>
      </div>
    </div>
  )
}

TableFooter.propTypes = {
  column: PropTypes.object,
  header: PropTypes.object,
  width: PropTypes.number
}

export default React.memo(TableFooter)
