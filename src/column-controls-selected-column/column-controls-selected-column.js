import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Popper from '@mui/material/Popper'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Checkbox from '@mui/material/Checkbox'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import CloseIcon from '@mui/icons-material/Close'

import {
  fuzzy_match,
  get_string_from_object,
  levenstein_distance,
  debounce,
  group_parameters
} from '../utils'
import DataTypeIcon from '../data-type-icon'
import ColumnControlsColumnParamItem from '../column-controls-column-param-item'

const ColumnControlsSelectedColumn = React.memo(
  ({
    all_columns,
    column,
    set_column_hidden_by_index,
    set_local_table_state,
    column_index,
    selected_column_indexes,
    set_selected_column_indexes,
    splits
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: `${column.column_id}-${column_index}`
    })

    const has_column_params = Boolean(column.column_params)
    const [show_column_params, set_show_column_params] = useState(false)
    const [param_filter_text, set_param_filter_text] = useState('')
    const param_filter_input_ref = useRef(null)
    const [more_menu_open, set_more_menu_open] = useState(false)
    const more_button_ref = useRef(null)
    const [column_select_open, set_column_select_open] = useState(false)
    const column_select_button_ref = useRef(null)
    const [column_select_filter, set_column_select_filter] = useState('')
    const [filtered_columns, set_filtered_columns] = useState(all_columns)

    const style = {
      position: 'relative',
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : null
    }

    useEffect(() => {
      if (show_column_params && param_filter_input_ref.current) {
        param_filter_input_ref.current.focus()
      }
    }, [show_column_params])

    const handle_param_filter_change = (event) => {
      set_param_filter_text(event.target.value)
    }

    const handle_column_select_filter_change = (event) => {
      set_column_select_filter(event.target.value)
    }

    const filtered_params = useMemo(() => {
      if (param_filter_text) {
        return Object.entries(column.column_params || {}).filter(
          ([param_name]) => fuzzy_match(param_filter_text, param_name)
        )
      }
      return Object.entries(column.column_params || {})
    }, [param_filter_text, column.column_params])

    const debounced_filter_columns = useCallback(
      debounce((filter) => {
        if (filter) {
          const filtered = all_columns
            .filter((col) =>
              fuzzy_match(filter, col.column_title || col.column_id)
            )
            .sort((a, b) => {
              const distance_a = levenstein_distance(
                filter,
                a.column_title || a.column_id
              )
              const distance_b = levenstein_distance(
                filter,
                b.column_title || b.column_id
              )
              return distance_a - distance_b
            })
          set_filtered_columns(filtered)
        } else {
          set_filtered_columns(all_columns)
        }
      }, 100),
      [all_columns]
    )

    useEffect(() => {
      debounced_filter_columns(column_select_filter)
    }, [column_select_filter, debounced_filter_columns])

    const handle_more_click = () => {
      set_more_menu_open(!more_menu_open)
    }

    const handle_remove_click = () => {
      set_column_hidden_by_index(column_index)
      set_more_menu_open(false)
    }

    const handle_duplicate_click = () => {
      set_local_table_state((prev) => ({
        ...prev,
        columns: [
          ...prev.columns.slice(0, column_index + 1),
          prev.columns[column_index],
          ...prev.columns.slice(column_index + 1)
        ]
      }))
      // Shift selected column indexes to account for the added column
      set_selected_column_indexes((prev_indexes) => {
        return prev_indexes.map((index) => {
          if (index > column_index) {
            return index + 1
          }
          return index
        })
      })
      set_more_menu_open(false)
    }

    const handle_column_select = (new_column) => {
      set_local_table_state((prev) => ({
        ...prev,
        columns: prev.columns.map((col, index) =>
          index === column_index
            ? typeof col === 'string'
              ? new_column.column_id
              : {
                  ...col,
                  column_id: new_column.column_id,
                  column_params: Object.fromEntries(
                    Object.entries(col.column_params || {}).filter(
                      ([key]) => new_column.column_params[key]
                    )
                  )
                }
            : col
        )
      }))
      set_column_select_open(false)
    }

    const grouped_params = useMemo(() => {
      return group_parameters(Object.fromEntries(filtered_params))
    }, [filtered_params])

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          className={get_string_from_object({
            'column-item': true,
            reorder: true,
            'column-expanded': show_column_params,
            selected: selected_column_indexes.includes(column_index),
            'more-menu-open': more_menu_open,
            'column-select-open': column_select_open
          })}>
          <div className='column-data-type'>
            <DataTypeIcon data_type={column.data_type} />
          </div>
          <div
            ref={column_select_button_ref}
            onClick={() => set_column_select_open(!column_select_open)}
            className='column-name'>
            {column.column_title || column.column_id}
          </div>
          <Popper
            open={column_select_open}
            anchorEl={column_select_button_ref.current}
            placement='bottom-start'>
            <ClickAwayListener
              onClickAway={() => set_column_select_open(false)}>
              <div className='column-select-menu'>
                <div className='column-select-filter-container'>
                  <TextField
                    variant='outlined'
                    margin='none'
                    fullWidth
                    id='column-select-filter'
                    label='Search columns'
                    size='small'
                    autoComplete='off'
                    autoFocus
                    value={column_select_filter}
                    onChange={handle_column_select_filter_change}
                  />
                </div>
                <div className='column-select-list'>
                  <MenuList>
                    {filtered_columns.map((col) => (
                      <MenuItem
                        key={col.column_id}
                        onClick={() => handle_column_select(col)}>
                        {col.column_title || col.column_id}
                      </MenuItem>
                    ))}
                  </MenuList>
                </div>
              </div>
            </ClickAwayListener>
          </Popper>
          {has_column_params && (
            <Button
              size='small'
              className='column-action'
              onClick={() => set_show_column_params(!show_column_params)}>
              {show_column_params ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Button>
          )}
          <Button
            size='small'
            className='column-action'
            onClick={() => set_column_hidden_by_index(column_index)}>
            <CloseIcon />
          </Button>
          <Button
            size='small'
            className='column-action'
            onClick={handle_more_click}
            ref={more_button_ref}>
            <MoreVertIcon />
          </Button>
          <Popper
            open={more_menu_open}
            anchorEl={more_button_ref.current}
            placement='bottom-start'>
            <ClickAwayListener onClickAway={() => set_more_menu_open(false)}>
              <MenuList className='more-menu'>
                <MenuItem onClick={handle_remove_click}>
                  <ListItemIcon>
                    <DeleteIcon fontSize='small' />
                  </ListItemIcon>
                  <ListItemText>Remove</ListItemText>
                </MenuItem>
                <MenuItem onClick={handle_duplicate_click}>
                  <ListItemIcon>
                    <ContentCopyIcon fontSize='small' />
                  </ListItemIcon>
                  <ListItemText>Duplicate</ListItemText>
                </MenuItem>
              </MenuList>
            </ClickAwayListener>
          </Popper>
          {has_column_params && (
            <Checkbox
              checked={selected_column_indexes.includes(column_index)}
              onChange={(event) => {
                set_selected_column_indexes(
                  event.target.checked
                    ? [...selected_column_indexes, column_index]
                    : selected_column_indexes.filter(
                        (index) => index !== column_index
                      )
                )
              }}
            />
          )}
          <div className='column-drag-handle' {...listeners}>
            <DragIndicatorIcon />
          </div>
          {show_column_params && (
            <div className='column-params-container'>
              <TextField
                variant='outlined'
                margin='normal'
                fullWidth
                id='param-filter'
                label='Search parameters'
                name='param_filter'
                size='small'
                autoComplete='off'
                value={param_filter_text}
                onChange={handle_param_filter_change}
                inputRef={param_filter_input_ref}
              />
              {Object.entries(grouped_params).map(([group_name, params]) => (
                <div key={group_name} className='column-param-group'>
                  {group_name !== 'Ungrouped' && (
                    <div className='column-param-group-title'>{group_name}</div>
                  )}
                  {params.map(
                    ([column_param_name, column_param_definition]) => (
                      <ColumnControlsColumnParamItem
                        key={column_param_name}
                        column={column}
                        set_local_table_state={set_local_table_state}
                        column_index={column_index}
                        column_param_name={column_param_name}
                        column_param_definition={column_param_definition}
                        splits={splits}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

ColumnControlsSelectedColumn.displayName = 'ColumnControlsSelectedColumn'
ColumnControlsSelectedColumn.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_hidden_by_index: PropTypes.func.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  selected_column_indexes: PropTypes.array.isRequired,
  set_selected_column_indexes: PropTypes.func.isRequired,
  splits: PropTypes.array,
  all_columns: PropTypes.array
}

export default ColumnControlsSelectedColumn
