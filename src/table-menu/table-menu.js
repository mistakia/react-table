import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CodeIcon from '@mui/icons-material/Code'
import LinkIcon from '@mui/icons-material/Link'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import Switch from '@mui/material/Switch'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'

import {
  get_string_from_object,
  export_csv,
  export_json,
  export_markdown
} from '#src/utils'
import { format_column_params } from '#src/utils/format-column-params.js'
import { table_context } from '#src/table-context'
import { SHARE_LINK_URL_SCHEMA } from '#src/constants.mjs'

import './table-menu.styl'

function build_export_headers({ table_state, all_columns }) {
  const headers = []
  const seen = new Set()
  const push = (header) => {
    let row_key = header.row_key
    if (seen.has(row_key)) {
      row_key = `${row_key}_${header.column_index}`
    }
    seen.add(row_key)
    headers.push({ ...header, row_key })
  }

  for (const column of table_state.prefix_columns || []) {
    const column_id = typeof column === 'string' ? column : column.column_id
    const column_def = all_columns[column_id]
    push({
      row_key: column_def?.column_title || column_id,
      export_value: column_def?.export_value,
      accessorFn: column_def?.accessorFn,
      accessorKey: column_def?.accessorKey,
      column_index: 0
    })
  }

  const column_indices = {}
  for (const column of table_state.columns) {
    const column_id = typeof column === 'string' ? column : column.column_id
    const column_state_params =
      typeof column === 'string' ? undefined : column.params
    column_indices[column_id] = column_indices[column_id] || 0

    const column_def = all_columns[column_id]
    const column_label = column_def?.column_title || column_id
    const param_suffix = column_def
      ? format_column_params({
          column_def,
          column_state_params,
          variant: 'short'
        })
      : ''
    const column_index = column_indices[column_id]

    push({
      row_key: param_suffix
        ? `${column_label} (${param_suffix})`
        : column_label,
      export_value: column_def?.export_value,
      accessorFn: column_def?.accessorFn,
      accessorKey: column_def?.accessorKey,
      column_index
    })

    column_indices[column_id]++
  }

  for (const split of table_state.splits || []) {
    push({
      row_key: split,
      accessorKey: split,
      column_index: 0
    })
  }

  return headers
}

const TableMenu = ({
  data,
  table_state,
  all_columns,
  selected_view,
  reset_cache,
  clear_local_cache
}) => {
  const { shorten_url, get_export_api_url } = useContext(table_context)
  const [is_open, set_is_open] = useState(false)
  const [link_state, set_link_state] = useState('Copy Link')
  const [use_zero_values, set_use_zero_values] = useState(false)
  const has_reset_cache = typeof reset_cache === 'function'
  const has_clear_local_cache = typeof clear_local_cache === 'function'

  const handle_clear_local_cache = () => {
    if (!has_clear_local_cache) return
    clear_local_cache()
    set_is_open(false)
  }
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

    for (const [key, type] of Object.entries(
      SHARE_LINK_URL_SCHEMA.table_state
    )) {
      const value = table_state?.[key]
      if (type === 'array') {
        if (Array.isArray(value) && value.length > 0) {
          params.append(key, JSON.stringify(value))
        }
      } else if (type === 'object') {
        if (
          value &&
          typeof value === 'object' &&
          Object.keys(value).length > 0
        ) {
          params.append(key, JSON.stringify(value))
        }
      } else if (type === 'string') {
        if (value) params.append(key, value)
      } else if (type === 'boolean') {
        // Always emit booleans -- saved-view state may default to `true`, and
        // skipping `false` would let a stale `true` survive a round-trip.
        params.append(key, String(Boolean(value)))
      }
    }

    for (const key of SHARE_LINK_URL_SCHEMA.view) {
      const value = selected_view?.[key]
      if (value) params.append(key, value)
    }

    const shareable_link = `${window.location.origin}${
      window.location.pathname
    }?${params.toString()}`

    if (shorten_url) {
      set_link_state('Generating Link')
      try {
        const response = await shorten_url(shareable_link)
        const shortened_url = `${window.location.origin}${response.short_url}`
        await copy_to_clipboard(shortened_url)
        set_link_state('Copied Link')
      } catch (error) {
        console.error('shorten_url failed, falling back to long URL', error)
        await copy_to_clipboard(shareable_link)
        set_link_state('Copy Link Failed')
      }
    } else {
      await copy_to_clipboard(shareable_link)
      set_link_state('Copied Link')
    }

    setTimeout(() => {
      set_link_state('Copy Link')
    }, 2000)
  }

  const handle_zero_values_change = (event) => {
    set_use_zero_values(event.target.checked)
  }

  const get_cell_value = (row, header) => {
    let value
    if (header.export_value) {
      value = header.export_value({
        row,
        column_index: header.column_index
      })
    } else if (header.accessorFn) {
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
    const headers = build_export_headers({ table_state, all_columns })
    const download_data = data.map((row) => {
      const row_data = {}
      for (const header of headers) {
        let value = get_cell_value(row, header)
        if (Array.isArray(value)) value = value.join('|')
        row_data[header.row_key] = value
      }
      return row_data
    })

    export_csv({
      headers: headers.map((header) => header.row_key),
      data: download_data,
      file_name: 'table-export'
    })

    handle_close()
  }

  const handle_export_json = () => {
    const headers = build_export_headers({ table_state, all_columns })
    const download_data = data.map((row) => {
      const row_data = {}
      for (const header of headers) {
        row_data[header.row_key] = get_cell_value(row, header)
      }
      return row_data
    })

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

  const handle_export_markdown = () => {
    const headers = build_export_headers({ table_state, all_columns })
    const download_data = data.map((row) => {
      const row_data = {}
      for (const header of headers) {
        row_data[header.row_key] = get_cell_value(row, header)
      }
      return row_data
    })

    export_markdown({
      data: download_data,
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
      const column_state_params =
        typeof column === 'string' ? undefined : column.params
      const column_def = all_columns[column_id]
      const column_label = column_def?.column_title || column_id
      const param_suffix = column_def
        ? format_column_params({
            column_def,
            column_state_params,
            variant: 'short'
          })
        : ''
      headers.push(
        param_suffix ? `${column_label} (${param_suffix})` : column_label
      )
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
            export_value: column_def?.export_value,
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
            export_value: column_def?.export_value,
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
    if (!has_reset_cache) return
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

  const handle_copy_export_markdown_api_url = async () => {
    const url = get_export_api_url({
      view_id: selected_view.view_id,
      export_format: 'md'
    })
    await copy_to_clipboard(url)
    handle_close()
  }

  const handle_copy_export_html_api_url = async () => {
    const url = get_export_api_url({
      view_id: selected_view.view_id,
      export_format: 'html'
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
          {has_reset_cache && (
            <div
              className='table-menu-item'
              onClick={handle_reset_cache}
              role='menuitem'>
              <div className='table-menu-item-icon'>
                <RestartAltIcon fontSize='small' />
              </div>
              <div className='table-menu-item-text'>Recalculate View</div>
            </div>
          )}
          {has_clear_local_cache && (
            <div
              className='table-menu-item'
              onClick={handle_clear_local_cache}
              role='menuitem'>
              <div className='table-menu-item-icon'>
                <DeleteSweepIcon fontSize='small' />
              </div>
              <div className='table-menu-item-text'>Clear Local Cache</div>
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
            onClick={handle_export_markdown}
            role='menuitem'>
            <div className='table-menu-item-icon'>
              <CodeIcon fontSize='small' />
            </div>
            <div className='table-menu-item-text'>Export Markdown</div>
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
              <Tooltip title='When enabled, null values in the data will be replaced with zero during export and copy operations.' placement='top' enterDelay={700} enterNextDelay={300}>
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
              <div
                className='table-menu-item'
                onClick={handle_copy_export_markdown_api_url}
                role='menuitem'>
                <div className='table-menu-item-icon'>
                  <CodeIcon fontSize='small' />
                </div>
                <div className='table-menu-item-text'>
                  Copy Markdown API URL
                </div>
              </div>
              <div
                className='table-menu-item'
                onClick={handle_copy_export_html_api_url}
                role='menuitem'>
                <div className='table-menu-item-icon'>
                  <CodeIcon fontSize='small' />
                </div>
                <div className='table-menu-item-text'>Copy HTML API URL</div>
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
  reset_cache: PropTypes.func,
  clear_local_cache: PropTypes.func
}

export default React.memo(TableMenu)
