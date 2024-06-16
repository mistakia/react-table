import React, { useState } from 'react'
import PropTypes from 'prop-types'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CodeIcon from '@mui/icons-material/Code'

import { get_string_from_object, export_csv, export_json } from '../utils'

import './table-menu.styl'

const TableMenu = ({ data, table_state, all_columns }) => {
  const [is_open, set_is_open] = useState(false)

  const handle_click = () => {
    set_is_open(!is_open)
  }

  const handle_close = () => {
    set_is_open(false)
  }

  const handle_export_csv = () => {
    const download_data = []
    const headers = []

    if (table_state.prefix_columns) {
      for (const column of table_state.prefix_columns) {
        const column_id = typeof column === 'string' ? column : column.column_id
        const column_def = all_columns[column_id]
        const column_label = column_def.column_title || column_id
        headers.push({
          column_label,
          accessorKey: column_def.accessorKey
        })
      }
    }

    for (const column of table_state.columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      const column_label = column_def.column_title || column_id
      headers.push({
        column_label,
        accessorKey: column_def.accessorKey
      })
    }

    for (const row of data) {
      const row_data = {}
      for (const header of headers) {
        row_data[header.column_label] = row[header.accessorKey]
      }
      download_data.push(row_data)
    }

    export_csv({
      headers: headers.map((header) => header.column_label),
      data: download_data,
      file_name: 'table-export'
    })

    handle_close()
  }

  const handle_export_json = () => {
    const download_data = []
    const headers = []

    if (table_state.prefix_columns) {
      for (const column of table_state.prefix_columns) {
        const column_id = typeof column === 'string' ? column : column.column_id
        const column_def = all_columns[column_id]
        const column_label = column_def.column_title || column_id
        headers.push({
          column_label,
          accessorKey: column_def.accessorKey
        })
      }
    }

    for (const column of table_state.columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      const column_label = column_def.column_title || column_id
      headers.push({
        column_label,
        accessorKey: column_def.accessorKey
      })
    }

    for (const row of data) {
      const row_data = {}

      for (const header of headers) {
        row_data[header.column_label] = row[header.accessorKey]
      }

      download_data.push(row_data)
    }

    export_json({
      data: {
        title: 'Table Export',
        timestamp: new Date().toISOString(),
        data: download_data
      },
      file_name: 'table-export'
    })

    handle_close()
  }

  return (
    <div className='table-menu-container'>
      <div
        className='table-menu-button'
        aria-controls='simple-menu'
        aria-haspopup='true'
        onClick={handle_click}>
        <MoreHorizIcon />
      </div>
      <div
        className={get_string_from_object({
          'table-menu': true,
          'table-menu-open': is_open
        })}
        role='menu'>
        <div
          className='table-menu-item'
          onClick={handle_export_csv}
          role='menuitem'>
          <div className='table-menu-item-icon'>
            <CodeIcon fontSize='small' />
          </div>
          <div className='table-menu-item-text'>Export CSV</div>
        </div>
        <div
          className='table-menu-item'
          onClick={handle_export_json}
          role='menuitem'>
          <div className='table-menu-item-icon'>
            <CodeIcon fontSize='small' />
          </div>
          <div className='table-menu-item-text'>Export JSON</div>
        </div>
      </div>
    </div>
  )
}

TableMenu.propTypes = {
  data: PropTypes.array.isRequired,
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.object.isRequired
}

export default React.memo(TableMenu)
