import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  createColumnHelper
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import PropTypes from 'prop-types'
// import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
// import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LinearProgress from '@mui/material/LinearProgress'
// import IconButton from '@mui/material/IconButton'
// import CloseIcon from '@mui/icons-material/Close'

import TableCell from '../table-cell'
import TableHeader from '../table-header'
import TableFooter from '../table-footer'
import TableColumnControls from '../table-column-controls'
import TableViewController from '../table-view-controller'
import TableFilterControls from '../table-filter-controls'
import TableQuickFilter from '../table-quick-filter'
import TableSearch from '../table-search'
import TableMenu from '../table-menu'
import TableRankAggregationControls from '../table-rank-aggregation-controls'
import {
  get_string_from_object,
  get_scroll_parent,
  throttle_leading_edge,
  group_columns_by_groups,
  use_trace_update
} from '../utils'

import '../styles/mui-unstyled-popper.styl'
import '../styles/table-expanding-control-container.styl'
import '../styles/table-control-column-item.styl'
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
  on_save_view = () => {},
  table_state = {},
  saved_table_state = null,
  all_columns = {},
  selected_view = {},
  views = [],
  select_view = () => {},
  fetch_more = () => {},
  is_fetching = false,
  is_fetching_more = false,
  is_loading = false,
  disable_create_view = false,
  total_rows_fetched,
  total_row_count,
  delete_view = () => {},
  disable_rank_aggregation = false,
  style = {},
  percentiles = {}
}) {
  is_fetching_more = is_fetching
  console.log('Table')
  use_trace_update('Table', {
    data,
    on_view_change,
    table_state,
    all_columns,
    selected_view,
    views,
    select_view,
    fetch_more,
    is_fetching,
    is_fetching_more,
    is_loading,
    total_rows_fetched,
    total_row_count,
    delete_view,
    disable_rank_aggregation,
    style,
    percentiles
  })

  const INITIAL_LOAD_NUMBER = 20
  const OVERSCAN_COUNT = 10
  const ROWS_ADDED_ON_SCROLL = 50
  const SCROLL_DISTANCE_THRESHOLD = 2000
  const SLICE_SIZE_INCREMENT_DELAY = 2000

  const [slice_size, set_slice_size] = useState(INITIAL_LOAD_NUMBER)
  const [is_quick_filters_expanded, set_is_quick_filters_expanded] =
    useState(false)
  const [filter_controls_open, set_filter_controls_open] = useState(false)
  const table_container_ref = useRef()
  const [column_controls_open, set_column_controls_open] = useState(false)
  const is_view_editable = Boolean(selected_view.editable)

  const memoized_all_columns = useMemo(
    () => Object.values(all_columns),
    [all_columns]
  )

  const on_table_state_change = useCallback(
    ({ sort, prefix_columns, columns, where, rank_aggregation }) => {
      const { view_id, view_name, view_description } = selected_view
      on_view_change(
        {
          view_id,
          view_name,
          view_description,
          table_state: {
            sort,
            prefix_columns,
            columns,
            where,
            rank_aggregation
          }
        },
        {
          view_state_changed: true
        }
      )
    },
    [selected_view, on_view_change]
  )

  const is_table_state_changed = useMemo(() => {
    return (
      saved_table_state &&
      JSON.stringify(table_state) !== JSON.stringify(saved_table_state)
    )
  }, [table_state, saved_table_state])

  const save_table_state_change = useCallback(() => {
    if (is_table_state_changed) {
      const { view_id, view_name, view_description } = selected_view
      on_save_view({
        view_id,
        view_name,
        view_description,
        table_state
      })
    }
  }, [table_state, selected_view, on_save_view, is_table_state_changed])

  const discard_table_state_changes = useCallback(() => {
    const { view_id, view_name, view_description } = selected_view
    const { sort, prefix_columns, columns, where, rank_aggregation } =
      saved_table_state
    on_view_change(
      {
        view_id,
        view_name,
        view_description,
        table_state: {
          sort,
          prefix_columns,
          columns,
          where,
          rank_aggregation
        }
      },
      {
        view_state_changed: true
      }
    )
  }, [table_state, selected_view, on_view_change])

  const set_table_sort = useCallback(
    ({ column_id, desc, multi }) => {
      const column_definition = memoized_all_columns.find(
        (column) => column.column_id === column_id
      )
      if (!column_definition) {
        console.error(`Column with id ${column_id} not found`)
        return
      }

      const table_sort = table_state.sort || []
      const table_sort_map = new Map(
        table_sort.map((item) => [item.column_id, item])
      )

      if (table_sort_map.has(column_id)) {
        const existing_sort = table_sort_map.get(column_id)
        if (existing_sort.desc === desc) {
          table_sort_map.delete(column_id)
        } else {
          table_sort_map.set(column_id, { column_id, desc })
        }
      } else {
        if (!multi) {
          table_sort_map.clear()
        }
        table_sort_map.set(column_id, { column_id, desc })
      }

      on_table_state_change({
        ...table_state,
        sort: Array.from(table_sort_map.values())
      })
    },
    [memoized_all_columns, table_state, on_table_state_change]
  )

  const set_column_hidden = useCallback(
    (column_id) => {
      const columns = []

      for (const column of table_state.columns || []) {
        const cid = typeof column === 'string' ? column : column.column_id
        if (cid === column_id) {
          continue
        }
        columns.push(cid)
      }

      on_table_state_change({ ...table_state, columns })
    },
    [table_state, on_table_state_change]
  )

  const set_column_visible = useCallback(
    (column) => {
      on_table_state_change({
        ...table_state,
        columns: [...(table_state.columns || []), column]
      })
    },
    [table_state, on_table_state_change]
  )

  const set_column_visibility = useCallback(
    (updater_fn) => {
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
    },
    [set_column_visible, set_column_hidden]
  )

  const set_all_columns_hidden = useCallback(() => {
    on_table_state_change({ ...table_state, columns: [] })
  }, [table_state, on_table_state_change])

  const table_state_columns = useMemo(() => {
    const columns = []
    for (const column of table_state.columns || []) {
      const column_id =
        typeof column === 'string'
          ? column
          : column.column_id || column.id || column.column_name
      if (column_id && all_columns[column_id]) {
        columns.push(all_columns[column_id])
      }
    }
    return columns
  }, [table_state.columns, all_columns])

  const grouped_columns = useMemo(
    () => group_columns_by_groups(table_state_columns),
    [table_state_columns]
  )

  const prefix_columns = useMemo(() => {
    const columns = []
    for (const column of table_state.prefix_columns || []) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      if (!column_def) {
        continue
      }

      columns.push({
        ...column_def,
        prefix: true
      })
    }
    return columns
  }, [table_state.prefix_columns, all_columns])

  const table_columns = useMemo(
    () => [
      column_helper.display({
        id: 'column_index'
      }),
      ...prefix_columns,
      ...grouped_columns,
      column_helper.display({
        id: 'add_column_action'
      })
    ],
    [prefix_columns, grouped_columns]
  )

  const table = useReactTable({
    columns: table_columns,
    data,
    defaultColumn,
    state: table_state,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: set_column_visibility,
    columnResizeMode: 'onChange'
  })

  const { rows } = table.getRowModel()

  const throttled_set_slice_size = useCallback(
    throttle_leading_edge(() => {
      set_slice_size(slice_size + ROWS_ADDED_ON_SCROLL)
    }, SLICE_SIZE_INCREMENT_DELAY),
    [slice_size]
  )

  const fetch_more_on_bottom_reached = useCallback(
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

        if (
          scroll_height - scroll_top - client_height <
          SCROLL_DISTANCE_THRESHOLD
        ) {
          if (slice_size < rows.length) {
            throttled_set_slice_size()
            return
          }

          if (!is_fetching_more && total_rows_fetched < total_row_count) {
            const { view_id } = selected_view
            fetch_more({ view_id })
          }
        }
      }
    },
    [
      fetch_more,
      is_fetching_more,
      total_rows_fetched,
      total_row_count,
      slice_size,
      rows.length,
      throttled_set_slice_size,
      selected_view
    ]
  )

  useEffect(() => {
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
  }, [fetch_more_on_bottom_reached])

  useEffect(() => {
    const timeout = setTimeout(() => {
      set_slice_size(slice_size + ROWS_ADDED_ON_SCROLL)
    }, SLICE_SIZE_INCREMENT_DELAY)
    return () => clearTimeout(timeout)
  }, [])

  const row_virtualizer = useVirtualizer({
    getScrollElement: () => table_container_ref.current,
    estimateSize: () => 32,
    count: Math.min(data.length, slice_size),
    overscan: OVERSCAN_COUNT
  })
  const virtual_rows = row_virtualizer.getVirtualItems()

  const is_table_resizing = useCallback(() => {
    for (const headerGroup of table.getHeaderGroups()) {
      for (const header of headerGroup.headers) {
        if (header.column.getIsResizing()) {
          return true
        }
      }
    }
    return false
  }, [table])

  // const state_items = useMemo(() => {
  //   const items = []
  //   const table_sort = table_state.sort || []
  //   if (table_sort.length) {
  //     for (const sort of table_sort) {
  //       // get label from column
  //       items.push(
  //         <div key={sort.id} className='table-state-item'>
  //           <div className='table-state-item-content'>
  //             {sort.desc ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
  //             <span>{sort.id}</span>
  //           </div>
  //         </div>
  //       )
  //     }
  //   }

  //   const where_params = table_state.where || []
  //   if (where_params.length) {
  //     where_params.forEach((where, index) => {
  //       const { column_id, column_name, operator, value } = where

  //       items.push(
  //         <div key={index} className='table-state-item'>
  //           <div className='table-state-item-content'>
  //             <span>{`${column_id || column_name} ${operator} ${value}`}</span>
  //             <IconButton
  //               size='small'
  //               onClick={() => {
  //                 const new_where_params = [...where_params]
  //                 new_where_params.splice(index, 1)
  //                 on_table_state_change({
  //                   ...table_state,
  //                   where: new_where_params
  //                 })
  //               }}>
  //               <CloseIcon />
  //             </IconButton>
  //           </div>
  //         </div>
  //       )
  //     })
  //   }
  //   return items
  // }, [table_state, on_table_state_change])

  const view_quick_filters = useMemo(() => {
    const filters = []
    for (const view_filter of selected_view.view_filters || []) {
      const column_id =
        typeof view_filter === 'string' ? view_filter : view_filter.column_id
      const column = all_columns[column_id]

      filters.push(
        <TableQuickFilter
          key={column_id}
          {...{ column, table_state, on_table_state_change }}
        />
      )
    }
    return filters
  }, [
    selected_view.view_filters,
    all_columns,
    table_state,
    on_table_state_change
  ])

  return (
    <div style={style}>
      <div
        ref={table_container_ref}
        className={get_string_from_object({
          table: true,
          noselect: is_table_resizing()
        })}>
        <TableMenu {...{ data, table_state, all_columns }} />
        <div className='table-top-container'>
          <div className='table-top-container-body'>
            {Boolean(views.length) && (
              <TableViewController
                {...{
                  select_view,
                  selected_view,
                  views,
                  on_view_change,
                  delete_view,
                  disable_create_view
                }}
              />
            )}
            {selected_view.view_search_column_id && (
              <TableSearch
                {...{ selected_view, table_state, on_table_state_change }}
              />
            )}
            <div
              className={get_string_from_object({
                'table-controls-container': true,
                'rank-aggregation-controls-visible': !disable_rank_aggregation
              })}>
              <TableFilterControls
                {...{
                  filter_controls_open,
                  set_filter_controls_open,
                  table_state,
                  on_table_state_change,
                  all_columns: memoized_all_columns // TODO
                }}
              />
              {!disable_rank_aggregation && (
                <TableRankAggregationControls
                  {...{
                    table_state,
                    on_table_state_change,
                    all_columns: memoized_all_columns // TODO
                  }}
                />
              )}
              <TableColumnControls
                {...{
                  table_state,
                  table_state_columns,
                  on_table_state_change,
                  all_columns: memoized_all_columns, // TODO
                  set_all_columns_hidden,
                  column_controls_open,
                  set_column_controls_open,
                  prefix_columns
                }}
              />
              {is_table_state_changed && (
                <div className='table-state-change-controls'>
                  <div
                    className='table-state-change-control-button discard'
                    onClick={discard_table_state_changes}>
                    Reset
                  </div>
                  {is_view_editable && (
                    <div
                      className='table-state-change-control-button save'
                      onClick={save_table_state_change}>
                      Save
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* <div className='table-state-container'>{state_items}</div> */}
        </div>
        {selected_view.view_filters &&
          selected_view.view_filters.length > 0 && (
            <div
              className={get_string_from_object({
                'table-quick-filters': true,
                '-open': is_quick_filters_expanded
              })}>
              <div
                onClick={() =>
                  set_is_quick_filters_expanded(!is_quick_filters_expanded)
                }
                className='filters-expand-button'>
                {is_quick_filters_expanded ? 'Hide' : 'Quick Filters'}
                <KeyboardArrowDownIcon />
              </div>
              {is_quick_filters_expanded && (
                <div className='filter-items'>{view_quick_filters}</div>
              )}
            </div>
          )}
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
                    set_column_controls_open,
                    set_filter_controls_open,
                    set_table_sort
                  }}
                />
              ))}
            </div>
          ))}
          {(is_fetching_more || is_loading) && (
            <div className='table-loading-container'>
              <LinearProgress />
            </div>
          )}
        </div>
        {!is_loading && rows.length > 0 && (
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
        {!is_loading && rows.length > 0 && (
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
  is_fetching_more: PropTypes.bool,
  is_loading: PropTypes.bool,
  total_row_count: PropTypes.number,
  total_rows_fetched: PropTypes.number,
  delete_view: PropTypes.func,
  disable_rank_aggregation: PropTypes.bool,
  style: PropTypes.object,
  percentiles: PropTypes.object,
  disable_create_view: PropTypes.bool,
  on_save_view: PropTypes.func,
  saved_table_state: PropTypes.object
}
