import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CodeIcon from '@mui/icons-material/Code'
import LinkIcon from '@mui/icons-material/Link'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import Switch from '@mui/material/Switch'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'

import { get_string_from_object, export_csv, export_json } from '../utils'
import { table_context } from '../table-context'

import './table-menu.styl'

const TableMenu = ({
  data,
  table_state,
  all_columns,
  selected_view,
  reset_cache
}) => {
  const { shorten_url, disable_edit_view, get_export_api_url } =
    useContext(table_context)
  const [is_open, set_is_open] = useState(false)
  const [link_state, set_link_state] = useState('Copy Link')
  const [use_zero_values, set_use_zero_values] = useState(false)
  const is_saved_table = Boolean(
    selected_view.view_id &&
      selected_view.saved_table_state &&
      selected_view.user_id
  )

  const handle_click = () => {
    set_is_open(!is_open)
  }

  const handle_close = () => {
    set_is_open(false)
  }

  const copy_to_clipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handle_shareable_link = async () => {
    const params = new URLSearchParams()

    const { columns, prefix_columns, sort, where, splits } = table_state
    if (columns) params.append('columns', JSON.stringify(columns))
    if (prefix_columns)
      params.append('prefix_columns', JSON.stringify(prefix_columns))
    if (sort) params.append('sort', JSON.stringify(sort))
    if (where) params.append('where', JSON.stringify(where))
    if (splits) params.append('splits', JSON.stringify(splits))

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

    if (shorten_url) {
      set_link_state('Generating Link')
      const response = await shorten_url(shareable_link)
      const shortened_url = `${window.location.origin}${response.short_url}`
      await copy_to_clipboard(shortened_url)
    } else {
      await copy_to_clipboard(shareable_link)
    }
    set_link_state('Copied Link')

    setTimeout(() => {
      set_link_state('Copy Link')
    }, 2000)
  }

  const handle_zero_values_change = (event) => {
    set_use_zero_values(event.target.checked)
  }

  const get_cell_value = (row, header) => {
    let value
    if (header.accessorFn) {
      value = header.accessorFn({
        row,
        column_index: header.column_index
      })
    } else {
      value =
        row[`${header.accessorKey}_${header.column_index}`] ||
        row[header.accessorKey] ||
        ''
    }
    if (
      (value === null || value === undefined || value === '') &&
      use_zero_values
    ) {
      return 0
    }

    return value
  }

  const handle_export_csv = () => {
    const download_data = []
    const headers = []

    for (const column of table_state.prefix_columns || []) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      const column_label = column_def?.column_title || column_id

      headers.push({
        row_key: column_label,
        accessorFn: column_def?.accessorFn,
        accessorKey: column_def?.accessorKey,
        column_index: 0
      })
    }

    const column_indices = {}
    for (const column of table_state.columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      column_indices[column_id] = column_indices[column_id] || 0

      const column_def = all_columns[column_id]
      const column_label = column_def?.column_title || column_id
      const column_index = column_indices[column_id]

      headers.push({
        row_key: `${column_label}_${column_index}`,
        accessorFn: column_def?.accessorFn,
        accessorKey: column_def?.accessorKey,
        column_index
      })

      column_indices[column_id]++
    }

    for (const split of table_state.splits || []) {
      headers.push({
        row_key: split,
        accessorKey: split
      })
    }

    for (const row of data) {
      const row_data = {}
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
        let value = get_cell_value(row, header)

        if (Array.isArray(value)) {
          value = value.join('|')
        }

        row_data[header.row_key] = value
      }
      download_data.push(row_data)
    }

    export_csv({
      headers: headers.map((header) => header.row_key),
      data: download_data,
      file_name: 'table-export'
    })

    handle_close()
  }

  const handle_export_json = () => {
    const download_data = []
    const headers = []

    for (const column of table_state.prefix_columns || []) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      const column_label = column_def?.column_title || column_id

      headers.push({
        row_key: column_label,
        accessorFn: column_def?.accessorFn,
        accessorKey: column_def?.accessorKey,
        column_index: 0
      })
    }

    const column_id_counts = {}
    const column_indices = {}
    for (const column of table_state.columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      column_id_counts[column_id] = (column_id_counts[column_id] || 0) + 1
      column_indices[column_id] = column_indices[column_id] || 0

      const column_def = all_columns[column_id]
      const column_label = column_def?.column_title || column_id
      const column_index = column_indices[column_id]

      headers.push({
        row_key: `${column_label}_${column_index}`,
        accessorFn: column_def?.accessorFn,
        accessorKey: column_def?.accessorKey,
        column_index
      })

      column_indices[column_id]++
    }

    for (const split of table_state.splits || []) {
      headers.push({
        row_key: split,
        accessorKey: split
      })
    }

    for (const row of data) {
      const row_data = {}

      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
        row_data[header.row_key] = get_cell_value(row, header)
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

  const handle_copy_to_clipboard = async () => {
    const headers = []
    const tsv_rows = []

    // Prepare headers
    for (const column of table_state.prefix_columns || []) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      headers.push(column_def?.column_title || column_id)
    }

    for (const split of table_state.splits || []) {
      headers.push(split)
    }

    for (const column of table_state.columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      headers.push(column_def?.column_title || column_id)
    }

    tsv_rows.push(headers.join('\t'))

    // Prepare data rows
    for (const row of data) {
      const row_data = []

      for (const column of table_state.prefix_columns || []) {
        const column_id = typeof column === 'string' ? column : column.column_id
        const column_def = all_columns[column_id]
        row_data.push(
          get_cell_value(row, {
            accessorFn: column_def?.accessorFn,
            accessorKey: column_def?.accessorKey,
            column_index: 0
          })
        )
      }

      for (const split of table_state.splits || []) {
        row_data.push(row[split] || '')
      }

      const column_indices = {}
      for (const column of table_state.columns) {
        const column_id = typeof column === 'string' ? column : column.column_id
        column_indices[column_id] = column_indices[column_id] || 0

        const column_def = all_columns[column_id]
        const column_index = column_indices[column_id]
        row_data.push(
          get_cell_value(row, {
            accessorFn: column_def?.accessorFn,
            accessorKey: column_def?.accessorKey,
            column_index
          })
        )

        column_indices[column_id]++
      }

      tsv_rows.push(row_data.join('\t'))
    }

    const tsv_content = tsv_rows.join('\n')
    await copy_to_clipboard(tsv_content)

    handle_close()
  }

  const handle_reset_cache = () => {
    reset_cache()
    handle_close()
  }

  const handle_copy_export_csv_api_url = async () => {
    const url = get_export_api_url({
      view_id: selected_view.view_id,
      export_format: 'csv'
    })
    await copy_to_clipboard(url)
    handle_close()
  }

  const handle_copy_export_json_api_url = async () => {
    const url = get_export_api_url({
      view_id: selected_view.view_id,
      export_format: 'json'
    })
    await copy_to_clipboard(url)
    handle_close()
  }

  return (
    <ClickAwayListener onClickAway={handle_close}>
      <div className='table-menu-container'>
        <div
          className='table-menu-button'
          aria-controls='simple-menu'
          aria-haspopup='true'
          onClick={handle_click}>
          <MoreVertIcon />
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
            <div className='table-menu-item-text'>{link_state}</div>
          </div>
          {!disable_edit_view && (
            <div
              className='table-menu-item'
              onClick={handle_reset_cache}
              role='menuitem'>
              <div className='table-menu-item-icon'>
                <RestartAltIcon fontSize='small' />
              </div>
              <div className='table-menu-item-text'>Reset Cache</div>
            </div>
          )}
          <div className='table-menu-divider' />
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
          <div
            className='table-menu-item'
            onClick={handle_copy_to_clipboard}
            role='menuitem'>
            <div className='table-menu-item-icon'>
              <ContentCopyIcon fontSize='small' />
            </div>
            <div className='table-menu-item-text'>Copy To Clipboard</div>
          </div>
          <div className='table-menu-item'>
            <div className='table-menu-item-text small description'>
              <Tooltip title='When enabled, null values in the data will be replaced with zero during export and copy operations.'>
                <InfoIcon
                  fontSize='small'
                  style={{ marginRight: '8px', verticalAlign: 'middle' }}
                />
              </Tooltip>
              Use Zero for missing values
            </div>
            <Switch
              checked={use_zero_values}
              onChange={handle_zero_values_change}
              color='primary'
            />
          </div>
          {Boolean(is_saved_table) && (
            <>
              <div className='table-menu-divider' />
              <div
                className='table-menu-item'
                onClick={handle_copy_export_csv_api_url}
                role='menuitem'>
                <div className='table-menu-item-icon'>
                  <CodeIcon fontSize='small' />
                </div>
                <div className='table-menu-item-text'>Copy CSV API URL</div>
              </div>
              <div
                className='table-menu-item'
                onClick={handle_copy_export_json_api_url}
                role='menuitem'>
                <div className='table-menu-item-icon'>
                  <CodeIcon fontSize='small' />
                </div>
                <div className='table-menu-item-text'>Copy JSON API URL</div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClickAwayListener>
  )
}

TableMenu.propTypes = {
  data: PropTypes.array.isRequired,
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.object.isRequired,
  selected_view: PropTypes.object.isRequired,
  reset_cache: PropTypes.func.isRequired
}

export default React.memo(TableMenu)
