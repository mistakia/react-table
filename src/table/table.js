import React from 'react'
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
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import FilterListIcon from '@mui/icons-material/FilterList'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

import TableCell from '../table-cell'
import TableHeader from '../table-header'
import TableFooter from '../table-footer'
import TableColumnControls from '../table-column-controls'
import TableViewController from '../table-view-controller'
import TableFilterModal from '../table-filter-modal'
import { get_string_from_object, get_scroll_parent } from '../utils'

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
  data = [],
  on_view_change = () => {},
  table_state = {},
  all_columns = [],
  selected_view = {},
  views = [],
  select_view = () => {},
  fetch_more = () => {},
  is_fetching = false,
  total_rows_fetched,
  total_row_count,
  delete_view = () => {}
}) {
  const [filter_modal_open, set_filter_modal_open] = React.useState(false)
  const table_container_ref = React.useRef()
  const [column_controls_popper_open, set_column_controls_popper_open] =
    React.useState(false)

  const on_table_state_change = (new_table_state) =>
    on_view_change({
      ...selected_view,
      table_state: new_table_state
    })

  const set_sorting = (updater_fn) => {
    const new_sorting = updater_fn()
    const new_sort_item = new_sorting[0]
    const sorting = new Map()

    let is_new = true

    for (const sort of table_state.sorting || []) {
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

    on_table_state_change({
      ...table_state,
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

    for (const column of table_state.columns || []) {
      if (column.accessorKey === accessorKey) {
        continue
      }
      columns.push(column)
    }

    on_table_state_change({ ...table_state, columns })
  }

  const set_column_visible = (column) => {
    on_table_state_change({
      ...table_state,
      columns: [...(table_state.columns || []), column]
    })
  }

  const set_all_columns_hidden = () => {
    on_table_state_change({ ...table_state, columns: [] })
  }

  const table = useReactTable({
    columns: [
      column_helper.display({
        id: 'column_index'
      }),
      ...(table_state.columns || []),
      column_helper.display({
        id: 'add_column_action'
      })
    ],
    data,
    defaultColumn,
    state: table_state,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: set_sorting,
    onColumnVisibilityChange: set_column_visibility,
    columnResizeMode: 'onChange'
  })

  const fetch_more_on_bottom_reached = React.useCallback(
    function (container_ref) {
      if (container_ref) {
        const scroll_height = container_ref.scrollHeight
        const scroll_top = container_ref.scrollTop
        const client_height = container_ref.clientHeight

        const scroll_distance = 600
        if (
          scroll_height - scroll_top - client_height < scroll_distance &&
          !is_fetching &&
          total_rows_fetched < total_row_count
        ) {
          const { view_id } = selected_view
          fetch_more({ view_id })
        }
      }
    },
    [fetch_more, is_fetching, total_rows_fetched, total_row_count]
  )

  React.useEffect(() => {
    const scroll_parent = get_scroll_parent(table_container_ref.current)
    const onscroll = () => fetch_more_on_bottom_reached(scroll_parent)
    scroll_parent.addEventListener('scroll', onscroll)
    return () => scroll_parent.removeEventListener('scroll', onscroll)
  }, [fetch_more, is_fetching, total_rows_fetched, total_row_count])

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

  const sorting = table_state.sorting || []
  if (sorting.length) {
    for (const sort of sorting) {
      // get label from column
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

  const where_params = table_state.where || []
  if (where_params.length) {
    where_params.forEach((where, index) => {
      const { column_name, operator, value } = where

      state_items.push(
        <div key={index} className='state-item'>
          <div className='state-item-content'>
            <span>{`${column_name} ${operator} ${value}`}</span>
            <IconButton
              size='small'
              onClick={() => {
                const new_where_params = [...where_params]
                new_where_params.splice(index, 1)
                on_table_state_change({
                  ...table_state,
                  where: new_where_params
                })
              }}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      )
    })
  }

  return (
    <>
      <div
        ref={table_container_ref}
        className={get_string_from_object({
          table: true,
          noselect: is_table_resizing()
        })}>
        <div className='loading'>{is_fetching && <LinearProgress />}</div>
        <div className='panel'>
          <div className='controls'>
            {Boolean(views.length) && (
              <TableViewController
                {...{
                  select_view,
                  selected_view,
                  views,
                  on_view_change,
                  delete_view
                }}
              />
            )}
            <Button
              variant='text'
              size='small'
              onClick={() => set_filter_modal_open(true)}>
              <FilterListIcon />
              Filter
            </Button>
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
          <div className='state'>{state_items}</div>
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
                      table_state,
                      on_table_state_change,
                      set_column_controls_popper_open,
                      set_filter_modal_open
                    })
              )}
            </div>
          ))}
        </div>
        {virtual_rows.map((virtual_row) => {
          const row = rows[virtual_row.index]
          return (
            <div key={row.id} className='row'>
              {row.getVisibleCells().map((cell, index) =>
                flexRender(cell.column.columnDef.cell, {
                  key: index,
                  ...cell.getContext()
                })
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
      <TableFilterModal
        {...{
          filter_modal_open,
          set_filter_modal_open,
          table_state,
          on_table_state_change,
          all_columns
        }}
      />
    </>
  )
}

Table.propTypes = {
  data: PropTypes.array,
  on_view_change: PropTypes.func,
  table_state: PropTypes.object,
  all_columns: PropTypes.array,
  selected_view: PropTypes.object,
  select_view: PropTypes.func,
  views: PropTypes.array,
  fetch_more: PropTypes.func,
  is_fetching: PropTypes.bool,
  total_row_count: PropTypes.number,
  total_rows_fetched: PropTypes.number,
  delete_view: PropTypes.func
}
