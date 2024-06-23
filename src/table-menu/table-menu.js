import React, { useState } from 'react'
import PropTypes from 'prop-types'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CodeIcon from '@mui/icons-material/Code'
import LinkIcon from '@mui/icons-material/Link'
import copy from 'copy-text-to-clipboard'

import { get_string_from_object, export_csv, export_json } from '../utils'

import './table-menu.styl'

const TableMenu = ({ data, table_state, all_columns, selected_view }) => {
  const [is_open, set_is_open] = useState(false)
  const [link_copied, set_link_copied] = useState(false)

  const handle_click = () => {
    set_is_open(!is_open)
  }

  const handle_close = () => {
    set_is_open(false)
  }

  const handle_shareable_link = () => {
    const params = new URLSearchParams()

    const { columns, prefix_columns, sort, where } = table_state
    if (columns) params.append('columns', JSON.stringify(columns))
    if (prefix_columns)
      params.append('prefix_columns', JSON.stringify(prefix_columns))
    if (sort) params.append('sort', JSON.stringify(sort))
    if (where) params.append('where', JSON.stringify(where))

    const { view_id, view_name, view_search_column_id, view_description } =
      selected_view
    if (view_id) params.append('view_id', view_id)
    if (view_name) params.append('view_name', view_name)
    if (view_search_column_id)
      params.append('view_search_column_id', view_search_column_id)
    if (view_description) params.append('view_description', view_description)

    const shareable_link = `${window.location.origin}${
      window.location.pathname
    }?${params.toString()}`
    copy(shareable_link)
    set_link_copied(true)

    setTimeout(() => {
      set_link_copied(false)
    }, 2000)
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
          onClick={handle_shareable_link}
          role='menuitem'>
          <div className='table-menu-item-icon'>
            <LinkIcon fontSize='small' />
          </div>
          <div className='table-menu-item-text'>
            {link_copied ? 'Copied' : 'Copy Link'}
          </div>
        </div>
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
  all_columns: PropTypes.object.isRequired,
  selected_view: PropTypes.object.isRequired
}

export default React.memo(TableMenu)
