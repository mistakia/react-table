import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  createColumnHelper
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import PropTypes from 'prop-types'
// import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

import TableCell from '../table-cell'
import TableHeader from '../table-header'
import TableFooter from '../table-footer'
import TableColumnControls from '../table-column-controls'
import { get_string_from_object } from '../utils'

import '../styles/mui-unstyled-popper.styl'
import './table.styl'

const column_helper = createColumnHelper()
const defaultColumn = {
  minWidth: 50,
  width: 150,
  maxWidth: 400,
  cell: TableCell,
  header: TableHeader,
  footer: TableFooter,
  sortType: 'alphanumericFalsyLast'
}

export default function Table({
  data,
  on_table_change,
  table_state,
  all_columns
}) {
  const table_container_ref = React.useRef()
  const [column_controls_popper_open, set_column_controls_popper_open] =
    React.useState(false)

  const set_sorting = (updater_fn) => {
    const new_sorting = updater_fn()
    const new_sort_item = new_sorting[0]
    const sorting = new Map()

    let is_new = true

    for (const sort of table_state.get('sorting', [])) {
      if (sort.id === new_sort_item.id) {
        is_new = false
        const is_same = sort.desc === new_sort_item.desc
        if (is_same) {
          continue
        }
        sorting.set(new_sort_item.id, new_sort_item)
      } else {
        sorting.set(sort.id, sort)
      }
    }

    if (is_new) {
      sorting.set(new_sort_item.id, new_sort_item)
    }

    on_table_change({
      ...table_state.toJS(),
      sorting: Array.from(sorting.values())
    })
  }

  const set_column_visibility = (updater_fn) => {
    const new_column_item = updater_fn()

    // get first key of new_column_item
    const column_name = Object.keys(new_column_item)[0]
    const is_visible = new_column_item[column_name]
    if (is_visible) {
      set_column_visible(all_columns.find((c) => c.accessorKey === column_name))
    } else {
      set_column_hidden(column_name)
    }
  }

  const set_column_hidden = (accessorKey) => {
    const columns = []

    for (const column of table_state.get('columns', [])) {
      if (column.accessorKey === accessorKey) {
        continue
      }
      columns.push(column)
    }

    on_table_change({ ...table_state.toJS(), columns })
  }

  const set_column_visible = (column) => {
    on_table_change({
      ...table_state.toJS(),
      columns: [...table_state.get('columns', []), column]
    })
  }

  const set_all_columns_hidden = () => {
    on_table_change({ ...table_state.toJS(), columns: [] })
  }

  const table = useReactTable({
    columns: [
      column_helper.display({
        id: 'column_index'
      }),
      ...table_state.get('columns', []),
      column_helper.display({
        id: 'add_column_action'
      })
    ],
    data,
    defaultColumn,
    state: table_state.toJS(),
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: set_sorting,
    onColumnVisibilityChange: set_column_visibility,
    columnResizeMode: 'onChange'
  })

  const { rows } = table.getRowModel()

  const row_virtualizer = useVirtualizer({
    getScrollElement: () => table_container_ref.current,
    estimateSize: () => 32,
    parentRef: table_container_ref,
    count: rows.length,
    overscan: 10
  })
  const virtual_rows = row_virtualizer.getVirtualItems()

  function is_table_resizing() {
    for (const headerGroup of table.getHeaderGroups()) {
      for (const header of headerGroup.headers) {
        if (header.column.getIsResizing()) {
          return true
        }
      }
    }

    return false
  }

  const state_items = []

  const sorting = table_state.get('sorting', [])
  if (sorting.length) {
    for (const sort of sorting) {
      // get lable from column
      state_items.push(
        <div key={sort.id} className='state-item'>
          <div className='state-item-content'>
            {sort.desc ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
            <span>{sort.id}</span>
            {/* <ArrowDropDownIcon /> */}
          </div>
        </div>
      )
    }
  }

  return (
    <div
      ref={table_container_ref}
      className={get_string_from_object({
        table: true,
        noselect: is_table_resizing()
      })}>
      <div className='panel'>
        <div className='state'>{state_items}</div>
        <div className='controls'>
          {/* <FilterPopper /> */}
          <TableColumnControls
            {...{
              table_state,
              all_columns,
              set_column_hidden,
              set_column_visible,
              set_all_columns_hidden,
              column_controls_popper_open,
              set_column_controls_popper_open
            }}
          />
        </div>
      </div>
      <div className='header'>
        {table.getHeaderGroups().map((headerGroup, index) => (
          <div key={index} className='row'>
            {headerGroup.headers.map((header, index) =>
              header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, {
                    ...header.getContext(),
                    key: index,
                    set_column_controls_popper_open
                  })
            )}
          </div>
        ))}
      </div>
      {virtual_rows.map((virtual_row) => {
        const row = rows[virtual_row.index]
        return (
          <div key={row.id} className='row'>
            {row
              .getVisibleCells()
              .map((cell) =>
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
          </div>
        )
      })}
      <div className='footer'>
        {table.getFooterGroups().map((footerGroup, index) => (
          <div key={index} className='row'>
            {footerGroup.headers.map((footer, index) =>
              footer.isPlaceholder
                ? null
                : flexRender(footer.column.columnDef.footer, {
                    key: index,
                    ...footer.getContext()
                  })
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

Table.propTypes = {
  data: PropTypes.array,
  on_table_change: PropTypes.func,
  table_state: ImmutablePropTypes.map,
  all_columns: ImmutablePropTypes.list
}
