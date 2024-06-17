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
  group_columns_by_groups
} from '../utils'
import { table_context } from '../table-context'

import '../styles/mui-unstyled-popper.styl'
import '../styles/table-expanding-control-container.styl'
import '../styles/table-control-column-item.styl'
import './table.styl'

const is_mobile = window.innerWidth < 500
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

const MemoizedRow = React.memo(
  ({ row }) => (
    <div className={`row ${row.original.className}`}>
      {row.getAllCells().map((cell, index) =>
        flexRender(cell.column.columnDef.cell, {
          key: index,
          ...cell.getContext()
        })
      )}
    </div>
  ),
  (prevProps, nextProps) => prevProps.row.id === nextProps.row.id
)

MemoizedRow.displayName = 'MemoizedRow'
MemoizedRow.propTypes = {
  row: PropTypes.object.isRequired
}

const MemoizedHeader = React.memo(({ headerGroup }) => (
  <div className='row'>
    {headerGroup.headers.map((header, index) => (
      <TableHeader key={index} {...header.getContext()} />
    ))}
  </div>
))

MemoizedHeader.displayName = 'MemoizedHeader'
MemoizedHeader.propTypes = {
  headerGroup: PropTypes.object.isRequired
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
  percentiles = {},
  enable_duplicate_column_ids = false
}) {
  is_fetching_more = is_fetching

  const INITIAL_LOAD_NUMBER = 50
  const OVERSCAN_COUNT = 5
  const ROWS_ADDED_ON_SCROLL = is_mobile ? 10 : 25
  const SCROLL_DISTANCE_THRESHOLD = window.innerHeight * 0.5
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

  const throttled_set_slice_size = useCallback(
    throttle_leading_edge(() => {
      set_slice_size(slice_size + ROWS_ADDED_ON_SCROLL)
    }, SLICE_SIZE_INCREMENT_DELAY),
    [slice_size]
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
    ({ column_id, desc, multi, column_index = 0 }) => {
      const column_definition = memoized_all_columns.find(
        (column) => column.column_id === column_id
      )
      if (!column_definition) {
        console.error(`Column with id ${column_id} not found`)
        return
      }
      const table_sort = table_state.sort || []
      const table_sort_map = new Map(
        table_sort.map((item) => [
          `${item.column_id}-${item.column_index}`,
          item
        ])
      )
      const key = `${column_id}-${column_index}`
      if (table_sort_map.has(key)) {
        const existing_sort = table_sort_map.get(key)
        if (existing_sort.desc === desc) {
          table_sort_map.delete(key)
        } else {
          table_sort_map.set(key, { column_id, desc, column_index })
        }
      } else {
        if (!multi) {
          table_sort_map.clear()
        }
        table_sort_map.set(key, { column_id, desc, column_index })
      }
      on_table_state_change({
        ...table_state,
        sort: Array.from(table_sort_map.values())
      })
    },
    [memoized_all_columns, table_state, on_table_state_change]
  )

  const set_column_hidden_by_index = useCallback(
    (index) => {
      const columns = [...(table_state.columns || [])]
      columns.splice(index, 1)
      on_table_state_change({ ...table_state, columns })
    },
    [table_state, on_table_state_change]
  )

  const set_all_columns_hidden = useCallback(() => {
    on_table_state_change({ ...table_state, columns: [] })
  }, [table_state, on_table_state_change])

  const table_state_columns = useMemo(() => {
    let starting_index = (table_state.prefix_columns || []).length
    const columns = []
    for (const column of table_state.columns || []) {
      const column_id =
        typeof column === 'string'
          ? column
          : column.column_id || column.id || column.column_name
      if (column_id && all_columns[column_id]) {
        columns.push({
          ...all_columns[column_id],
          index: starting_index
        })
        starting_index += 1
      }
    }
    return columns
  }, [table_state.columns, table_state.prefix_columns, all_columns])

  const grouped_columns = useMemo(
    () => group_columns_by_groups(table_state_columns),
    [table_state_columns]
  )

  const prefix_columns = useMemo(() => {
    const columns = []
    let index = 0
    for (const column of table_state.prefix_columns || []) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_def = all_columns[column_id]
      if (!column_def) {
        continue
      }

      columns.push({
        ...column_def,
        index,
        prefix: true
      })
      index += 1
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
    columnResizeMode: 'onChange'
  })

  const rows = useMemo(() => table.getRowModel().rows, [data])

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
    const onscroll = is_mobile
      ? throttle_leading_edge(
          () => fetch_more_on_bottom_reached(scroll_parent),
          150
        )
      : () => fetch_more_on_bottom_reached(scroll_parent)

    if (container_is_body) {
      window.removeEventListener('scroll', onscroll)
      window.addEventListener('scroll', onscroll, { passive: true })
    } else {
      scroll_parent.removeEventListener('scroll', onscroll)
      scroll_parent.addEventListener('scroll', onscroll, { passive: true })
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

  const header_items = useMemo(() => {
    return table
      .getHeaderGroups()
      .map((headerGroup, index) => (
        <MemoizedHeader key={index} headerGroup={headerGroup} />
      ))
  }, [table_state])

  const row_items = useMemo(() => {
    return virtual_rows.map((virtual_row) => {
      const row = rows[virtual_row.index]
      return <MemoizedRow key={virtual_row.index} row={row} />
    })
  }, [virtual_rows, rows])

  return (
    <table_context.Provider
      value={{
        enable_duplicate_column_ids,
        percentiles,
        table_state,
        on_table_state_change,
        set_column_controls_open,
        set_filter_controls_open,
        set_table_sort,
        set_column_hidden_by_index
      }}>
      <div
        ref={table_container_ref}
        style={style}
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
          {header_items}
          {(is_fetching_more || is_loading) && (
            <div className='table-loading-container'>
              <LinearProgress />
            </div>
          )}
        </div>
        {!is_loading && rows.length > 0 && (
          <div className='body'>{row_items}</div>
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
    </table_context.Provider>
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
  saved_table_state: PropTypes.object,
  enable_duplicate_column_ids: PropTypes.bool
}
