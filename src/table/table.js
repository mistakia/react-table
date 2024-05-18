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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
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
import TableFilter from '../table-filter'
import TableSearch from '../table-search'
import TableRankAggregationModal from '../table-rank-aggregation-modal'
import {
  get_string_from_object,
  get_scroll_parent,
  throttle_leading_edge,
  group_columns_by_groups
} from '../utils'

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

function use_trace_update(props) {
  const prev = React.useRef(props)
  React.useEffect(() => {
    const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
      if (prev.current[k] !== v) {
        ps[k] = [prev.current[k], v]
      }
      return ps
    }, {})
    if (Object.keys(changedProps).length > 0) {
      console.log('Changed props:', changedProps)
    }
    prev.current = props
  })
}

export default function Table({
  data = [],
  on_view_change = () => {},
  table_state = {},
  all_columns = {},
  selected_view = {},
  views = [],
  select_view = () => {},
  fetch_more = () => {},
  is_fetching = false,
  total_rows_fetched,
  total_row_count,
  delete_view = () => {},
  disable_rank_aggregation = false,
  style = {},
  percentiles = {}
}) {
  use_trace_update({
    data,
    on_view_change,
    table_state,
    all_columns,
    selected_view,
    views,
    select_view,
    fetch_more,
    is_fetching,
    total_rows_fetched,
    total_row_count,
    delete_view
  })

  const [slice_size, set_slice_size] = React.useState(20)
  const [filters_expanded, set_filters_expanded] = React.useState(false)
  const [filter_modal_open, set_filter_modal_open] = React.useState(false)
  const table_container_ref = React.useRef()
  const [column_controls_popper_open, set_column_controls_popper_open] =
    React.useState(false)

  const on_table_state_change = React.useCallback(
    (new_table_state) => {
      on_view_change(
        {
          ...selected_view,
          table_state: new_table_state
        },
        {
          view_state_changed: true
        }
      )
    },
    [selected_view]
  )

  const set_sorting = (updater_fn) => {
    const new_sorting = updater_fn()
    const column_definition = Object.values(all_columns).find(
      (column) => column.column_name === new_sorting[0].id
    )
    const column_id = column_definition.column_id
    const new_sort_item = { id: column_id, desc: new_sorting[0].desc }

    const sorting = new Map()

    let is_new = true

    for (const sort of table_state.sort || []) {
      if (sort.id === column_id) {
        is_new = false
        const is_same = sort.desc === new_sort_item.desc
        if (is_same) {
          continue
        }
        sorting.set(column_id, new_sort_item)
      } else {
        sorting.set(sort.id, sort)
      }
    }

    if (is_new) {
      sorting.set(new_sort_item.id, new_sort_item)
    }

    on_table_state_change({
      ...table_state,
      sort: Array.from(sorting.values())
    })
  }

  const set_column_visibility = (updater_fn) => {
    const new_column_item = updater_fn()

    // get first key of new_column_item
    const column_id = Object.keys(new_column_item)[0]
    const is_visible = new_column_item[column_id]
    if (is_visible) {
      // TODO - check if working correctly
      set_column_visible(column_id)
    } else {
      set_column_hidden(column_id)
    }
  }

  const set_column_hidden = (column_id) => {
    const columns = []

    for (const column of table_state.columns || []) {
      const cid = typeof column === 'string' ? column : column.column_id
      if (cid === column_id) {
        continue
      }
      columns.push(cid)
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

  const table_state_columns = []
  for (const column of table_state.columns || []) {
    const column_id =
      typeof column === 'string'
        ? column
        : column.column_id || column.id || column.column_name
    if (column_id && all_columns[column_id]) {
      table_state_columns.push(all_columns[column_id])
    }
  }

  const grouped_columns = group_columns_by_groups(table_state_columns)

  const prefix_columns = []
  for (const column of table_state.prefix_columns || []) {
    const column_id = typeof column === 'string' ? column : column.column_id
    const column_def = all_columns[column_id]
    if (!column_def) {
      continue
    }

    prefix_columns.push({
      ...column_def,
      prefix: true
    })
  }

  const table_columns = [
    column_helper.display({
      id: 'column_index'
    }),
    ...prefix_columns,
    ...grouped_columns,
    column_helper.display({
      id: 'add_column_action'
    })
  ]

  const table = useReactTable({
    columns: table_columns,
    data,
    defaultColumn,
    state: table_state,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: set_sorting,
    onColumnVisibilityChange: set_column_visibility,
    columnResizeMode: 'onChange'
  })

  const { rows } = table.getRowModel()

  const throttled_set_slice_size = React.useCallback(
    throttle_leading_edge(() => {
      set_slice_size(slice_size + 30)
    }, 2000),
    [slice_size]
  )

  const fetch_more_on_bottom_reached = React.useCallback(
    (container_ref) => {
      if (container_ref) {
        const container_is_body = container_ref === document.body
        const scroll_height = container_ref.scrollHeight
        const scroll_top = container_is_body
          ? document.documentElement.scrollTop
          : container_ref.scrollTop
        const client_height = container_is_body
          ? window.innerHeight
          : container_ref.clientHeight

        const scroll_distance = 2000
        if (scroll_height - scroll_top - client_height < scroll_distance) {
          if (slice_size < rows.length) {
            throttled_set_slice_size()
            return
          }

          if (!is_fetching && total_rows_fetched < total_row_count) {
            const { view_id } = selected_view
            fetch_more({ view_id })
          }
        }
      }
    },
    [fetch_more, is_fetching, total_rows_fetched, total_row_count, slice_size]
  )

  React.useEffect(() => {
    const scroll_parent = get_scroll_parent(table_container_ref.current)
    const container_is_body = document.body === scroll_parent
    const onscroll = () => fetch_more_on_bottom_reached(scroll_parent)

    if (container_is_body) {
      window.removeEventListener('scroll', onscroll)
      window.addEventListener('scroll', onscroll)
    } else {
      scroll_parent.removeEventListener('scroll', onscroll)
      scroll_parent.addEventListener('scroll', onscroll)
    }

    return () => {
      if (container_is_body) {
        window.removeEventListener('scroll', onscroll)
      } else {
        scroll_parent.removeEventListener('scroll', onscroll)
      }
    }
  }, [fetch_more, is_fetching, total_rows_fetched, total_row_count, slice_size])

  React.useEffect(() => {
    setTimeout(() => {
      set_slice_size(slice_size + 30)
    }, 2000)
  }, [])

  const row_virtualizer = useVirtualizer({
    getScrollElement: () => table_container_ref.current, // get_scroll_parent(table_container_ref.current),
    estimateSize: () => 32,
    count: Math.min(data.length, slice_size),
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

  const sorting = table_state.sort || []
  if (sorting.length) {
    for (const sort of sorting) {
      // get label from column
      state_items.push(
        <div key={sort.id} className='state-item'>
          <div className='state-item-content'>
            {sort.desc ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
            <span>{sort.id}</span>
          </div>
        </div>
      )
    }
  }

  const where_params = table_state.where || []
  if (where_params.length) {
    where_params.forEach((where, index) => {
      const { column_id, column_name, operator, value } = where

      state_items.push(
        <div key={index} className='state-item'>
          <div className='state-item-content'>
            <span>{`${column_id || column_name} ${operator} ${value}`}</span>
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

  const view_quick_filters = []
  for (const view_filter of selected_view.view_filters || []) {
    const column_id =
      typeof view_filter === 'string' ? view_filter : view_filter.column_id
    const column = all_columns[column_id]

    view_quick_filters.push(
      <TableFilter
        key={column_id}
        {...{ column, table_state, on_table_state_change }}
      />
    )
  }

  return (
    <div style={style}>
      <div
        ref={table_container_ref}
        className={get_string_from_object({
          table: true,
          noselect: is_table_resizing()
        })}>
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
            {selected_view.view_search_column_id && (
              <TableSearch
                {...{ selected_view, table_state, on_table_state_change }}
              />
            )}
            <Button
              variant='outlined'
              size='small'
              onClick={() => set_filter_modal_open(true)}>
              <FilterListIcon />
              Filter
            </Button>
            {!disable_rank_aggregation && (
              <TableRankAggregationModal
                {...{
                  table_state,
                  on_table_state_change,
                  all_columns: Object.values(all_columns) // TODO
                }}
              />
            )}
            <TableColumnControls
              {...{
                table_state,
                table_state_columns,
                on_table_state_change,
                all_columns: Object.values(all_columns), // TODO
                set_column_hidden,
                set_column_visible,
                set_all_columns_hidden,
                column_controls_popper_open,
                set_column_controls_popper_open,
                prefix_columns
              }}
            />
          </div>
          <div className='state'>{state_items}</div>
        </div>
        <div className='filters'>
          <Button
            endIcon={<KeyboardArrowDownIcon />}
            onClick={() => set_filters_expanded(!filters_expanded)}
            className='filters-expand-button'>
            {filters_expanded ? 'Hide' : 'Filters'}
          </Button>
          {filters_expanded && (
            <div className='filter-items'>{view_quick_filters}</div>
          )}
        </div>
        <div className='header'>
          {table.getHeaderGroups().map((headerGroup, index) => (
            <div key={index} className='row'>
              {headerGroup.headers.map((header, index) => (
                <TableHeader
                  key={index}
                  {...{
                    ...header.getContext(),
                    key: index,
                    table_state,
                    on_table_state_change,
                    set_column_controls_popper_open,
                    set_filter_modal_open
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        {is_fetching && (
          <div className='loading'>
            <LinearProgress />
          </div>
        )}
        {!is_fetching && (
          <div className='body'>
            {virtual_rows.map((virtual_row) => {
              const row = rows[virtual_row.index]
              return (
                <div key={row.id} className={`row ${row.original.className}`}>
                  {row.getVisibleCells().map((cell, index) =>
                    flexRender(cell.column.columnDef.cell, {
                      key: index,
                      percentiles,
                      ...cell.getContext()
                    })
                  )}
                </div>
              )
            })}
          </div>
        )}
        {!is_fetching && (
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
        )}
      </div>
      <TableFilterModal
        {...{
          filter_modal_open,
          set_filter_modal_open,
          table_state,
          on_table_state_change,
          all_columns: Object.values(all_columns) // TODO
        }}
      />
    </div>
  )
}

Table.propTypes = {
  data: PropTypes.array,
  on_view_change: PropTypes.func,
  table_state: PropTypes.object,
  all_columns: PropTypes.object,
  selected_view: PropTypes.object,
  select_view: PropTypes.func,
  views: PropTypes.array,
  fetch_more: PropTypes.func,
  is_fetching: PropTypes.bool,
  total_row_count: PropTypes.number,
  total_rows_fetched: PropTypes.number,
  delete_view: PropTypes.func,
  disable_rank_aggregation: PropTypes.bool,
  style: PropTypes.object,
  percentiles: PropTypes.object
}
