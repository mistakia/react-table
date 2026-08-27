import React, { useContext } from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'
import { table_context } from '#src/table-context'
import AddColumnActionSpacer from '#src/add-column-action-spacer'

const TableFooter = ({ column, header, width }) => {
  const { sticky_left, is_sticky_column, table_state } =
    useContext(table_context)

  const is_group_header = header.column.columns.length

  if (is_group_header) {
    return null
  }

  if (column.columnDef.id === 'add_column_action') {
    return <AddColumnActionSpacer {...{ table_state }} />
  }

  if (column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content' />
      </div>
    )
  }

  // The footer pins with the same columns the header and body do -- left
  // unpinned, its cells slide out from under the pinned columns on horizontal
  // scroll and paint over them.
  const is_sticky = is_sticky_column(column)

  return (
    <div
      {...{
        className: get_string_from_object({ cell: true, sticky: is_sticky }),
        style: {
          width,
          left: sticky_left(column)
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
