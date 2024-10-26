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
import TableSplitsControls from '../table-splits-controls'
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
import ScatterPlotOverlay from '../scatter-plot-overlay/scatter-plot-overlay'

import '../styles/mui-unstyled-popper.styl'
import '../styles/table-expanding-control-container.styl'
import '../styles/table-control-column-item.styl'
import '../styles/button.styl'
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
  disable_edit_view = false,
  total_rows_fetched,
  total_row_count,
  delete_view = () => {},
  disable_rank_aggregation = false,
  style = {},
  percentiles = {},
  enable_duplicate_column_ids = false,
  new_view_prefix_columns = [],
  shorten_url,
  is_selected_view_editable = false,
  table_username = 'system',
  reset_cache = null,
  get_export_api_url = () => {},
  get_scatter_point_label = (row) => '',
  get_scatter_point_image = null,
  is_scatter_plot_point_label_enabled = () => true
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
  const [filters_local_table_state, set_filters_local_table_state] =
    useState(table_state)
  const [selected_scatter_columns, set_selected_scatter_columns] = useState({
    x: null,
    y: null,
    x_column_id: null,
    y_column_id: null
  })
  const [show_scatter_plot, set_show_scatter_plot] = useState(false)

  const memoized_all_columns = useMemo(
    () => Object.values(all_columns),
    [all_columns]
  )

  const memoized_visible_columns = useMemo(
    () => memoized_all_columns.filter((column) => !column.hidden),
    [memoized_all_columns]
  )

  const throttled_set_slice_size = useCallback(
    throttle_leading_edge(() => {
      set_slice_size(slice_size + ROWS_ADDED_ON_SCROLL)
    }, SLICE_SIZE_INCREMENT_DELAY),
    [slice_size]
  )

  const on_table_state_change = useCallback(
    ({ sort, prefix_columns, columns, where, rank_aggregation, splits }) => {
      const { view_id, view_name, view_username, view_description } =
        selected_view

      // cleanup state

      // check if any params are set to disable on splits and remove them
      if (splits && splits.length > 0) {
        const remove_disabled_params = (item) => {
          if (item && typeof item === 'object' && item.params) {
            const column_definition = all_columns[item.column_id]
            if (column_definition && column_definition.column_params) {
              Object.keys(item.params).forEach((param_name) => {
                const param_definition =
                  column_definition.column_params[param_name]
                if (param_definition && param_definition.disable_on_splits) {
                  delete item.params[param_name]
                }
              })
            }
          }
        }

        columns && columns.forEach(remove_disabled_params)
        where && where.forEach(remove_disabled_params)
      }

      // remove any where items where the operator is not IS NULL or IS NOT NULL and has a null, undefined, or empty string value
      if (where) {
        where = where.filter(
          (item) =>
            item.operator === 'IS NULL' ||
            item.operator === 'IS NOT NULL' ||
            (item.value !== null &&
              item.value !== undefined &&
              item.value !== '')
        )
      }

      on_view_change(
        {
          view_id,
          view_name,
          view_username,
          view_description,
          table_state: {
            sort,
            prefix_columns,
            columns,
            where,
            rank_aggregation,
            splits
          }
        },
        {
          view_state_changed: true
        }
      )
    },
    [selected_view, on_view_change]
  )

  const is_table_state_changed = useMemo(
    () =>
      !saved_table_state ||
      JSON.stringify(table_state) !== JSON.stringify(saved_table_state),
    [table_state, saved_table_state]
  )

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
    const { view_id, view_name, view_description, view_username } =
      selected_view
    const { sort, prefix_columns, columns, where, rank_aggregation, splits } =
      saved_table_state
    on_view_change(
      {
        view_id,
        view_name,
        view_description,
        view_username,
        table_state: {
          sort,
          prefix_columns,
          columns,
          where,
          rank_aggregation,
          splits
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

      // Remove that column_id from sort
      const column_to_hide = columns[index]
      const column_id_to_hide =
        typeof column_to_hide === 'string'
          ? column_to_hide
          : column_to_hide.column_id
      const table_sort = table_state.sort || []
      const sort = table_sort.filter((s) => s.column_id !== column_id_to_hide)

      // Remove the column by index
      columns.splice(index, 1)

      on_table_state_change({ ...table_state, columns, sort })
    },
    [table_state, on_table_state_change]
  )

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
    () => group_columns_by_groups(table_state_columns, table_state.columns),
    [table_state_columns, table_state.columns]
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
        id: `prefix-${column_id}`,
        index,
        prefix: true
      })
      index += 1
    }
    return columns
  }, [table_state.prefix_columns, all_columns])

  const splits_columns = useMemo(() => {
    if (!table_state.splits || table_state.splits.length === 0) {
      return null
    }

    const columns = []
    for (const split of table_state.splits || []) {
      columns.push(
        column_helper.display({
          id: split,
          header_label: split,
          is_split: true,
          size: 70
        })
      )
    }
    return column_helper.group({
      header: 'Splits',
      columns
    })
  }, [table_state.splits])

  const table_columns = useMemo(
    () =>
      [
        column_helper.display({
          id: 'column_index'
        }),
        ...prefix_columns,
        splits_columns,
        ...grouped_columns,
        column_helper.display({
          id: 'add_column_action'
        })
      ].filter(Boolean),
    [prefix_columns, splits_columns, grouped_columns]
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

  const sticky_columns = useMemo(
    () => table.getAllLeafColumns().filter((col) => col.columnDef.sticky),
    [table]
  )

  const sticky_column_sizes = useMemo(() => {
    return sticky_columns.map((col) => col.getSize())
  }, [sticky_columns, table.getState().columnSizingInfo])

  const sticky_left = useCallback(
    (column) => {
      if (!column.columnDef.sticky) return 0

      let total_width = 0
      for (const col of sticky_columns) {
        if (col.id === column.id) break
        total_width += col.getSize()
      }

      return total_width
    },
    [sticky_columns, sticky_column_sizes]
  )

  const set_selected_scatter_column = useCallback(
    ({
      axis,
      composite_column_id,
      column_id,
      accessor_path,
      column_params
    }) => {
      set_selected_scatter_columns((prev) => {
        if (prev[axis] === composite_column_id) {
          return {
            ...prev,
            [axis]: null,
            [`${axis}_column_id`]: null,
            [`${axis}_accessor_path`]: null,
            [`${axis}_column_params`]: null
          }
        }
        return {
          ...prev,
          [axis]: composite_column_id,
          [`${axis}_column_id`]: column_id,
          [`${axis}_accessor_path`]: accessor_path,
          [`${axis}_column_params`]: column_params
        }
      })
    },
    [all_columns]
  )

  const open_scatter_plot = useCallback(() => {
    if (selected_scatter_columns.x && selected_scatter_columns.y) {
      set_show_scatter_plot(true)
    }
  }, [selected_scatter_columns])

  const close_scatter_plot = useCallback(() => {
    set_show_scatter_plot(false)
  }, [])

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
        set_column_hidden_by_index,
        shorten_url,
        filters_local_table_state,
        set_filters_local_table_state,
        all_columns,
        table_username,
        sticky_left,
        sticky_columns,
        sticky_column_sizes,
        disable_edit_view,
        get_export_api_url,
        selected_scatter_columns,
        set_selected_scatter_column,
        open_scatter_plot
      }}>
      <div
        ref={table_container_ref}
        style={style}
        className={get_string_from_object({
          table: true,
          noselect: is_table_resizing()
        })}>
        <div className='table-top-container'>
          {Boolean(views.length) && (
            <TableViewController
              {...{
                select_view,
                selected_view,
                views,
                on_view_change,
                delete_view,
                disable_create_view,
                disable_edit_view,
                new_view_prefix_columns
              }}
            />
          )}
          <div className='table-search-and-controls-container'>
            <TableMenu
              {...{
                data,
                table_state,
                all_columns,
                selected_view,
                table_username,
                reset_cache
              }}
            />
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
              {!disable_rank_aggregation && (
                <TableRankAggregationControls
                  {...{
                    table_state,
                    on_table_state_change,
                    all_columns: memoized_visible_columns // TODO
                  }}
                />
              )}
              <TableColumnControls
                {...{
                  table_state,
                  all_columns: memoized_visible_columns, // TODO
                  on_table_state_change,
                  prefix_columns,
                  column_controls_open
                }}
              />
              <TableFilterControls
                {...{
                  filter_controls_open,
                  set_filter_controls_open,
                  table_state,
                  on_table_state_change,
                  all_columns: memoized_visible_columns // TODO
                }}
              />
              <TableSplitsControls
                {...{
                  table_state,
                  on_table_state_change,
                  table_state_columns
                }}
              />
              <div className='table-top-lead-buttons-container'>
                {is_table_state_changed && (
                  <>
                    {Boolean(saved_table_state) && (
                      <div
                        className='table-top-lead-button discard'
                        onClick={discard_table_state_changes}>
                        Reset
                      </div>
                    )}
                    {is_selected_view_editable && (
                      <div
                        className='table-top-lead-button save'
                        onClick={save_table_state_change}>
                        Save
                      </div>
                    )}
                  </>
                )}
                {selected_scatter_columns.x && selected_scatter_columns.y && (
                  <div
                    className='table-top-lead-button show-plot'
                    onClick={open_scatter_plot}>
                    Show Plot
                  </div>
                )}
              </div>
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
                <div className='quick-filter-items'>{view_quick_filters}</div>
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
                        ...footer.getContext(),
                        width: footer.column.getSize()
                      })
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {show_scatter_plot && (
        <ScatterPlotOverlay
          data={data}
          x_column={all_columns[selected_scatter_columns.x_column_id]}
          x_accessor_path={selected_scatter_columns.x_accessor_path}
          x_column_params={selected_scatter_columns.x_column_params}
          y_column={all_columns[selected_scatter_columns.y_column_id]}
          y_accessor_path={selected_scatter_columns.y_accessor_path}
          y_column_params={selected_scatter_columns.y_column_params}
          get_point_label={get_scatter_point_label}
          get_point_image={get_scatter_point_image}
          is_scatter_plot_point_label_enabled={
            is_scatter_plot_point_label_enabled
          }
          on_close={close_scatter_plot}
        />
      )}
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
  disable_edit_view: PropTypes.bool,
  on_save_view: PropTypes.func,
  saved_table_state: PropTypes.object,
  enable_duplicate_column_ids: PropTypes.bool,
  new_view_prefix_columns: PropTypes.array,
  shorten_url: PropTypes.func,
  is_selected_view_editable: PropTypes.bool,
  table_username: PropTypes.string,
  reset_cache: PropTypes.func,
  get_export_api_url: PropTypes.func,
  get_scatter_point_label: PropTypes.func,
  get_scatter_point_image: PropTypes.func,
  is_scatter_plot_point_label_enabled: PropTypes.func
}
