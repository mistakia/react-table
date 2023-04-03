import React from 'react'
import PropTypes from 'prop-types'
import AddIcon from '@mui/icons-material/Add'
import PopperUnstyled from '@mui/base/PopperUnstyled'
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
  set_column_controls_popper_open
}) {
  if (header.column.columnDef.id === 'add_column_action') {
    return <AddColumnAction {...{ set_column_controls_popper_open }} />
  }

  if (header.column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content' />
      </div>
    )
  }

  const anchor_el = React.useRef()
  const [popper_open, set_popper_open] = React.useState(false)

  const is_sorted = header.column.getIsSorted()
  const { data_type } = header.column.columnDef
  const is_sortable = data_type !== TABLE_DATA_TYPES.JSON

  const handle_sort_ascending = () => column.toggleSorting(false, true)
  const handle_sort_descending = () => column.toggleSorting(true, true)

  return (
    <>
      <ClickAwayListener onClickAway={() => set_popper_open(false)}>
        <div
          {...{
            className: 'cell',
            colSpan: header.colSpan,
            ref: anchor_el,
            onClick: () => set_popper_open(!popper_open),
            style: {
              width: header.getSize()
            }
          }}>
          <div
            {...{
              className: 'cell-content',
              style: {
                background: is_sorted ? '#f5f5f5' : 'transparent'
              }
            }}>
            <div
              style={{
                display: 'flex ',
                alignItems: 'center',
                height: '100%'
              }}>
              <div className='header-icon'>
                <DataTypeIcon data_type={column.columnDef.data_type} />
              </div>
              <div style={{ flex: 1 }}>{column.columnDef.header_label}</div>
              {is_sorted === 'asc' && (
                <div className='header-sort-icon'>
                  <ArrowUpwardIcon />
                </div>
              )}
              {is_sorted === 'desc' && (
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
      <PopperUnstyled
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
                    selected: is_sorted === 'asc'
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
                    selected: is_sorted === 'desc'
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
            <div className='header-menu-item-button'>
              <div className='header-menu-item-icon'>
                <FilterListIcon />
              </div>
              <div>Filter</div>
            </div>
          </div>
        </div>
      </PopperUnstyled>
    </>
  )
}

TableHeader.propTypes = {
  header: PropTypes.object,
  column: PropTypes.object,
  table: PropTypes.object,
  set_column_controls_popper_open: PropTypes.func.isRequired
}
