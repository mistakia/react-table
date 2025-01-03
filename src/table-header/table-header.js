import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useContext,
  useEffect
} from 'react'
import PropTypes from 'prop-types'
import AddIcon from '@mui/icons-material/Add'
import { Popper } from '@mui/base/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import FilterListIcon from '@mui/icons-material/FilterList'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'

import { get_string_from_object } from '../utils'
import { TABLE_DATA_TYPES, OPERATOR_MENU_DEFAULT_VALUE } from '../constants.mjs'
import DataTypeIcon from '../data-type-icon'
import { table_context } from '../table-context'

import './table-header.styl'

export function AddColumnAction({ set_column_controls_open }) {
  return (
    <div className='cell add-column-action'>
      <div className='cell-content'>
        <Tooltip title='Add Column'>
          <IconButton
            onClick={() => set_column_controls_open(true)}
            className='add-column-action-button'>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  )
}

AddColumnAction.propTypes = {
  set_column_controls_open: PropTypes.func.isRequired
}

const TableHeader = ({ header, column, table }) => {
  const {
    table_state,
    set_column_controls_open,
    set_filter_controls_open,
    set_table_sort,
    set_column_hidden_by_index,
    set_filters_local_table_state,
    sticky_left,
    selected_scatter_columns,
    set_selected_scatter_column,
    enable_duplicate_column_ids
  } = useContext(table_context)
  const anchor_el = useRef()
  const [popper_open, set_popper_open] = useState(false)
  const [opened_by_hover, set_opened_by_hover] = useState(false)
  const close_timer_ref = useRef(null)
  const is_hovering_ref = useRef(false)

  const handle_mouse_enter = useCallback(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      clearTimeout(close_timer_ref.current)
      is_hovering_ref.current = true
      set_popper_open(true)
      set_opened_by_hover(true)
    }
  }, [])

  const handle_mouse_leave = useCallback(() => {
    if (opened_by_hover) {
      is_hovering_ref.current = false
      if (!is_hovering_ref.current) {
        set_popper_open(false)
        set_opened_by_hover(false)
      }
    }
  }, [opened_by_hover])

  const handle_click = useCallback(() => {
    clearTimeout(close_timer_ref.current)
    set_popper_open((prev) => !prev)
    set_opened_by_hover(false)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(close_timer_ref.current)
    }
  }, [])

  const column_index = useMemo(() => {
    const columns_with_same_id = table
      .getAllLeafColumns()
      .filter((col) => col.columnDef.column_id === column.columnDef.column_id)
    const sorted_columns_with_same_id = columns_with_same_id.sort(
      (a, b) => a.columnDef.index - b.columnDef.index
    )

    return sorted_columns_with_same_id.findIndex(
      (col) => col.columnDef.index === column.columnDef.index
    )
  }, [column, table])
  const table_state_columns_index = useMemo(() => {
    let count = 0
    return (table_state.columns || []).findIndex((c) => {
      const current_column_id = typeof c === 'string' ? c : c.column_id
      if (current_column_id === column.columnDef.column_id) {
        if (count === column_index) {
          return true
        }
        count++
      }
      return false
    })
  }, [table_state.columns, column.columnDef.column_id, column_index])

  const table_sort = table_state.sort || []
  const sort_column_id = column.columnDef.column_id || column.id
  const column_sort = table_sort?.find(
    (i) =>
      i.column_id === sort_column_id && (i.column_index || 0) === column_index
  )
  const column_sort_direction = column_sort?.desc ? 'desc' : 'asc'
  const is_sorted = Boolean(column_sort) && !header.isPlaceholder
  const is_multi = Boolean(table_sort?.length > 1)
  const has_other_sort = table_sort?.some(
    (sort) =>
      sort.column_id !== sort_column_id ||
      (sort.column_index || 0) !== column_index
  )
  const { data_type } = header.column.columnDef
  const is_sortable = data_type !== TABLE_DATA_TYPES.JSON

  const column_id = column.columnDef.column_id
  const composite_column_id = `${column_id}-${column_index}`
  const accessor_path = enable_duplicate_column_ids
    ? `${column.columnDef.accessorKey}_${column_index}`
    : column.columnDef.id

  const handle_sort_ascending = useCallback(
    () =>
      set_table_sort({
        column_id: sort_column_id,
        column_index,
        desc: false,
        multi: false
      }),
    [column, set_table_sort]
  )
  const handle_sort_descending = useCallback(() => {
    set_table_sort({
      column_id: sort_column_id,
      column_index,
      desc: true,
      multi: false
    })
  }, [column, set_table_sort])
  const handle_sort_ascending_multi = useCallback(
    () =>
      set_table_sort({
        column_id: sort_column_id,
        column_index,
        desc: false,
        multi: true
      }),
    [column, set_table_sort]
  )
  const handle_sort_descending_multi = useCallback(
    () =>
      set_table_sort({
        column_id: sort_column_id,
        column_index,
        desc: true,
        multi: true
      }),
    [column, set_table_sort]
  )
  const handle_open_filter = useCallback(() => {
    const where_param = table_state.where || []
    const matching_columns = table_state.columns.filter(
      (col) => col.column_id === column.columnDef.column_id
    )
    const existing_column = matching_columns[column_index]
    const operator = column.columnDef.operators
      ? column.columnDef.operators[0]
      : OPERATOR_MENU_DEFAULT_VALUE

    set_filters_local_table_state({
      ...table_state,
      where: [
        ...where_param,
        {
          column_id: column.columnDef.column_id,
          operator,
          value: '',
          params: existing_column?.params || {}
        }
      ]
    })
    setTimeout(() => {
      set_filter_controls_open(true)
    }, 10)
  }, [
    column.columnDef,
    table_state,
    set_filter_controls_open,
    set_filters_local_table_state
  ])

  const handle_select_for_scatter_x = useCallback(() => {
    set_selected_scatter_column({
      axis: 'x',
      composite_column_id,
      column_id,
      accessor_path,
      column_params: table_state.columns[table_state_columns_index]?.params
    })
  }, [
    composite_column_id,
    column_id,
    accessor_path,
    set_selected_scatter_column,
    table_state_columns_index,
    table_state
  ])

  const handle_select_for_scatter_y = useCallback(() => {
    set_selected_scatter_column({
      axis: 'y',
      composite_column_id,
      column_id,
      accessor_path,
      column_params: table_state.columns[table_state_columns_index]?.params
    })
  }, [
    composite_column_id,
    column_id,
    accessor_path,
    set_selected_scatter_column,
    table_state_columns_index,
    table_state
  ])

  const is_selected_for_scatter_x =
    selected_scatter_columns.x === composite_column_id
  const is_selected_for_scatter_y =
    selected_scatter_columns.y === composite_column_id

  const is_grouped = Boolean(column.parent?.columns.length)
  const is_group_end =
    (is_grouped &&
      column.parent.columns[column.parent.columns.length - 1].id ===
        column.id) ||
    !is_grouped
  const width = header.getSize()

  const sticky_left_value = sticky_left(column)

  if (header.column.columnDef.id === 'add_column_action') {
    if (header.depth > 1) {
      return null
    }
    return <AddColumnAction {...{ set_column_controls_open }} />
  }

  if (header.column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content' />
      </div>
    )
  }

  const is_group_header = header.column.columns.length
  if (is_group_header) {
    return (
      <div
        {...{
          className: 'cell border_bottom',
          style: {
            width: header.getSize(),
            borderRight: '1px solid #D0D0D0'
          }
        }}>
        <Tooltip title={header.column.columnDef.header}>
          <div
            className='cell-content'
            style={{
              textAlign: 'center',
              paddingTop: '6px'
            }}>
            {header.column.columnDef.header}
          </div>
        </Tooltip>
      </div>
    )
  }

  const description = header.column.columnDef.description

  return (
    <>
      <ClickAwayListener
        onClickAway={() => {
          clearTimeout(close_timer_ref.current)
          set_popper_open(false)
          set_opened_by_hover(false)
        }}>
        <div
          {...{
            className: get_string_from_object({
              cell: true,
              sorted: is_sorted,
              group_end: is_group_end,
              border_bottom: !header.isPlaceholder,
              sticky: column.columnDef.sticky
            }),
            colSpan: header.colSpan,
            ref: anchor_el,
            onClick: handle_click,
            ...(header.isPlaceholder
              ? {}
              : {
                  onMouseEnter: handle_mouse_enter,
                  onMouseLeave: handle_mouse_leave
                }),
            style: { width, left: sticky_left_value }
          }}>
          <div className='cell-content'>
            <div
              style={{
                display: 'flex ',
                alignItems: 'center',
                height: '100%'
              }}>
              {width > 90 && !header.isPlaceholder && (
                <div className='header-icon'>
                  <DataTypeIcon data_type={column.columnDef.data_type} />
                </div>
              )}
              {!header.isPlaceholder && (
                <div style={{ flex: 1 }}>{column.columnDef.header_label}</div>
              )}
              {is_sorted && column_sort_direction === 'asc' && (
                <div className='header-sort-icon'>
                  <ArrowUpwardIcon />
                </div>
              )}
              {is_sorted && column_sort_direction === 'desc' && (
                <div className='header-sort-icon'>
                  <ArrowDownwardIcon />
                </div>
              )}
            </div>
          </div>
          <div
            {...{
              onMouseDown: header.getResizeHandler(),
              onTouchStart: header.getResizeHandler(),
              className: get_string_from_object({
                resizer: true,
                is_resizing: header.column.getIsResizing()
              }),
              style: {
                transform: header.column.getIsResizing()
                  ? `translateX(${
                      table.getState().columnSizingInfo.deltaOffset
                    }px)`
                  : ''
              }
            }}
          />
        </div>
      </ClickAwayListener>
      <Popper
        className='table-popper header-popper'
        anchorEl={anchor_el.current}
        open={popper_open}
        placement='bottom'
        style={{ zIndex: 1000 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 0]
            }
          }
        ]}
        onMouseEnter={handle_mouse_enter}
        onMouseLeave={handle_mouse_leave}>
        {description && (
          <div className='header-text header-description'>{description}</div>
        )}
        <div style={{ paddingTop: '6px', paddingBottom: '6px' }}>
          {/* can not remove split columns from here */}
          {Boolean(column.columnDef.column_id) && (
            <div className='header-menu-item'>
              <div
                className='header-menu-item-button'
                onClick={() =>
                  set_column_hidden_by_index(table_state_columns_index)
                }>
                <div className='header-menu-item-icon'>
                  <VisibilityOffIcon />
                </div>
                <div>Remove column</div>
              </div>
            </div>
          )}
          {is_sortable && (
            <>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected:
                      is_sorted && !is_multi && column_sort_direction === 'asc'
                  })}
                  onClick={handle_sort_ascending}>
                  <div className='header-menu-item-icon'>
                    <ArrowUpwardIcon />
                  </div>
                  <div>
                    {is_sorted && !is_multi && column_sort_direction === 'asc'
                      ? 'Remove ascending sort'
                      : 'Sort ascending'}
                  </div>
                </div>
              </div>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected:
                      is_sorted && !is_multi && column_sort_direction === 'desc'
                  })}
                  onClick={handle_sort_descending}>
                  <div className='header-menu-item-icon'>
                    <ArrowDownwardIcon />
                  </div>
                  <div>
                    {is_sorted && !is_multi && column_sort_direction === 'desc'
                      ? 'Remove descending sort'
                      : 'Sort descending'}
                  </div>
                </div>
              </div>
              {has_other_sort && (
                <>
                  <div className='header-menu-item'>
                    <div
                      className={get_string_from_object({
                        'header-menu-item-button': true,
                        selected:
                          is_sorted &&
                          is_multi &&
                          column_sort_direction === 'asc'
                      })}
                      onClick={handle_sort_ascending_multi}>
                      <div className='header-menu-item-icon'>
                        <ArrowUpwardIcon />
                      </div>
                      <div>
                        {is_sorted &&
                        is_multi &&
                        column_sort_direction === 'asc'
                          ? 'Remove ascending sort (multi)'
                          : 'Sort ascending (multi)'}
                      </div>
                    </div>
                  </div>
                  <div className='header-menu-item'>
                    <div
                      className={get_string_from_object({
                        'header-menu-item-button': true,
                        selected:
                          is_sorted &&
                          is_multi &&
                          column_sort_direction === 'desc'
                      })}
                      onClick={handle_sort_descending_multi}>
                      <div className='header-menu-item-icon'>
                        <ArrowDownwardIcon />
                      </div>
                      <div>
                        {is_sorted &&
                        is_multi &&
                        column_sort_direction === 'desc'
                          ? 'Remove descending sort (multi)'
                          : 'Sort descending (multi)'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {/* TODO allow filters for split columns */}
          {Boolean(column.columnDef.column_id) && (
            <div className='header-menu-item'>
              <div
                className='header-menu-item-button'
                onClick={handle_open_filter}>
                <div className='header-menu-item-icon'>
                  <FilterListIcon />
                </div>
                <div>Filter</div>
              </div>
            </div>
          )}
          {data_type === TABLE_DATA_TYPES.NUMBER && (
            <>
              <div className='header-menu-divider'></div>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected: is_selected_for_scatter_x
                  })}
                  onClick={handle_select_for_scatter_x}>
                  <div className='header-menu-item-icon'>
                    {is_selected_for_scatter_x ? (
                      <CheckBoxIcon />
                    ) : (
                      <CheckBoxOutlineBlankIcon />
                    )}
                  </div>
                  <div>
                    {is_selected_for_scatter_x
                      ? 'Unselect for scatter plot X'
                      : 'Select for scatter plot X'}
                  </div>
                </div>
              </div>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected: is_selected_for_scatter_y
                  })}
                  onClick={handle_select_for_scatter_y}>
                  <div className='header-menu-item-icon'>
                    {is_selected_for_scatter_y ? (
                      <CheckBoxIcon />
                    ) : (
                      <CheckBoxOutlineBlankIcon />
                    )}
                  </div>
                  <div>
                    {is_selected_for_scatter_y
                      ? 'Unselect for scatter plot Y'
                      : 'Select for scatter plot Y'}
                  </div>
                </div>
              </div>
              <div className='header-text small'>
                Select an X and Y column to generate a scatter plot. Once both
                are selected, you can show the scatter plot.
              </div>
            </>
          )}
        </div>
      </Popper>
    </>
  )
}

TableHeader.propTypes = {
  header: PropTypes.object,
  column: PropTypes.object,
  table: PropTypes.object
}

export default React.memo(TableHeader)
