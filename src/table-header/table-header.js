import React from 'react'
import PropTypes from 'prop-types'
import AddIcon from '@mui/icons-material/Add'
import Popper from '@mui/base/Popper'
import ClickAwayListener from '@mui/base/ClickAwayListener'
import FilterListIcon from '@mui/icons-material/FilterList'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

import { get_string_from_object } from '../utils'
import { TABLE_DATA_TYPES } from '../constants.mjs'
import DataTypeIcon from '../data-type-icon'

import './table-header.styl'

export function AddColumnAction({ set_column_controls_popper_open }) {
  return (
    <div className='cell add-column-action'>
      <div className='cell-content'>
        <Tooltip title='Add Column'>
          <IconButton onClick={() => set_column_controls_popper_open(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  )
}

AddColumnAction.propTypes = {
  set_column_controls_popper_open: PropTypes.func.isRequired
}

export default function TableHeader({
  header,
  column,
  table,
  table_state,
  on_table_state_change,
  set_column_controls_popper_open,
  set_filter_modal_open
}) {
  if (header.column.columnDef.id === 'add_column_action') {
    if (header.depth > 1) {
      return null
    }
    return <AddColumnAction {...{ set_column_controls_popper_open }} />
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
        <div className='cell-content'>
          <div
            style={{
              display: 'flex ',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
            {header.column.columnDef.header}
          </div>
        </div>
      </div>
    )
  }

  const anchor_el = React.useRef()
  const [popper_open, set_popper_open] = React.useState(false)

  const column_sort = table_state.sort?.find(
    (i) => i.id === column.columnDef.column_id
  )
  const column_sort_direction = column_sort?.desc ? 'desc' : 'asc'
  const is_sorted = Boolean(column_sort) && !header.isPlaceholder
  const { data_type } = header.column.columnDef
  const is_sortable = data_type !== TABLE_DATA_TYPES.JSON

  const handle_sort_ascending = () => column.toggleSorting(false, true)
  const handle_sort_descending = () => column.toggleSorting(true, true)
  const handle_open_filter = () => {
    const where_param = table_state.where || []
    where_param.push({
      column_id: column.columnDef.column_id,
      operator: '=',
      value: ''
    })
    on_table_state_change({
      ...table_state,
      where: where_param
    })
    set_filter_modal_open(true)
  }

  const is_grouped = Boolean(column.parent?.columns.length)
  const is_group_end =
    (is_grouped &&
      column.parent.columns[column.parent.columns.length - 1].id ===
        column.id) ||
    !is_grouped
  const width = header.getSize()

  let sticky_left = 0
  if (column.columnDef.sticky) {
    const leaf_columns = table.getAllLeafColumns()
    const previous_leaf_columns = []
    let cursor = 0
    while (leaf_columns[cursor].id !== column.id) {
      previous_leaf_columns.push(leaf_columns[cursor])
      cursor++
    }
    const sticky_previous_leaf_columns = previous_leaf_columns.filter(
      (column) => column.columnDef.sticky
    )

    sticky_left = sticky_previous_leaf_columns.reduce(
      (acc, column) => acc + column.getSize(),
      0
    )
  }

  return (
    <>
      <ClickAwayListener onClickAway={() => set_popper_open(false)}>
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
            onClick: () => set_popper_open(!popper_open),
            style: { width, left: sticky_left }
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
        anchorEl={anchor_el.current}
        open={popper_open}
        placement='bottom'
        style={{ zIndex: 1000 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8]
            }
          }
        ]}>
        <div style={{ paddingTop: '6px', paddingBottom: '6px' }}>
          <div className='header-menu-item'>
            <div
              className='header-menu-item-button'
              onClick={() => column.toggleVisibility(false)}>
              <div className='header-menu-item-icon'>
                <VisibilityOffIcon />
              </div>
              <div>Hide column</div>
            </div>
          </div>
          {is_sortable && (
            <>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected: column_sort_direction === 'asc'
                  })}
                  onClick={handle_sort_ascending}>
                  <div className='header-menu-item-icon'>
                    <ArrowUpwardIcon />
                  </div>
                  <div>Sort ascending</div>
                </div>
              </div>
              <div className='header-menu-item'>
                <div
                  className={get_string_from_object({
                    'header-menu-item-button': true,
                    selected: column_sort_direction === 'desc'
                  })}
                  onClick={handle_sort_descending}>
                  <div className='header-menu-item-icon'>
                    <ArrowDownwardIcon />
                  </div>
                  <div>Sort descending</div>
                </div>
              </div>
            </>
          )}
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
        </div>
      </Popper>
    </>
  )
}

TableHeader.propTypes = {
  header: PropTypes.object,
  column: PropTypes.object,
  table: PropTypes.object,
  set_column_controls_popper_open: PropTypes.func.isRequired,
  set_filter_modal_open: PropTypes.func.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}
