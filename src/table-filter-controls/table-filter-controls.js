import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import FilterListIcon from '@mui/icons-material/FilterList'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import IconButton from '@mui/material/IconButton'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { Popper } from '@mui/base/Popper'
import DeleteIcon from '@mui/icons-material/Delete'
import { useVirtualizer } from '@tanstack/react-virtual'

import DataTypeIcon from '../data-type-icon'
import {
  debounce,
  group_columns_into_tree_view,
  fuzzy_match,
  get_string_from_object,
  use_trace_update,
  use_count_children
} from '../utils'

import './table-filter-controls.styl'

const FILTER_ITEM_DEBOUNCE_DELAY = 3000
const MISC_MENU_DEFAULT_PLACEMENT = 'bottom-start'
const OPERATOR_MENU_DEFAULT_VALUE = '='
const OPERATOR_MENU_OPTIONS = [
  { value: '=', label: 'Equal to' },
  { value: '!=', label: 'Not equal to' },
  { value: '>', label: 'Greater than' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '<', label: 'Less than' },
  { value: '<=', label: 'Less than or equal' },
  { value: 'LIKE', label: 'Like' },
  { value: 'NOT LIKE', label: 'Not like' },
  { value: 'IN', label: 'In' },
  { value: 'NOT IN', label: 'Not in' },
  { value: 'IS NULL', label: 'Is empty' },
  { value: 'IS NOT NULL', label: 'Is not empty' }
]

const FilterItem = React.memo(
  ({ column_item, table_state, on_table_state_change, is_visible }) => {
    const anchor_el = useRef()
    const where_item = useMemo(() => {
      const where_param = table_state.where || []
      return (
        where_param.find((item) => item.column_id === column_item.column_id) ||
        {}
      )
    }, [table_state, column_item])
    const [filter_value, set_filter_value] = useState(where_item?.value || '')
    const [misc_menu_open, set_misc_menu_open] = useState(false)

    useEffect(() => {
      return () => {
        set_misc_menu_open(false)
      }
    }, [])

    const handle_create_filter = useCallback(
      ({ operator = OPERATOR_MENU_DEFAULT_VALUE, value = '' }) => {
        const where_param = table_state.where || []
        where_param.push({
          column_id: column_item.column_id,
          operator,
          value
        })
        on_table_state_change({
          ...table_state,
          where: where_param
        })
        set_misc_menu_open(false)
      },
      [column_item.column_id, on_table_state_change, table_state]
    )

    const handle_remove_click = useCallback(() => {
      const where_param = table_state.where || []
      const index = where_param.findIndex(
        (item) => item.column_id === where_item.column_id
      )
      where_param.splice(index, 1)
      on_table_state_change({
        ...table_state,
        where: where_param
      })
      set_misc_menu_open(false)
    }, [on_table_state_change, table_state, where_item.column_id])

    const handle_operator_change = useCallback(
      (event) => {
        const where_param = table_state.where || []
        const index = where_param.findIndex(
          (item) => item.column_id === where_item.column_id
        )

        if (index === -1) {
          return handle_create_filter({
            operator: event.target.value
          })
        }

        where_param[index].operator = event.target.value
        on_table_state_change({
          ...table_state,
          where: where_param
        })
      },
      [
        handle_create_filter,
        on_table_state_change,
        table_state,
        where_item.column_id
      ]
    )

    const handle_value_change_debounced = useMemo(
      () =>
        debounce((event) => {
          const where_param = table_state.where || []
          const index = where_param.findIndex(
            (item) => item.column_id === where_item.column_id
          )

          if (index === -1) {
            return handle_create_filter({
              value: event.target.value
            })
          }

          where_param[index].value = event.target.value
          on_table_state_change({
            ...table_state,
            where: where_param
          })
        }, FILTER_ITEM_DEBOUNCE_DELAY),
      [
        handle_create_filter,
        on_table_state_change,
        table_state,
        where_item.column_id
      ]
    )

    const handle_value_change = useCallback(
      (event) => {
        set_filter_value(event.target.value)
        handle_value_change_debounced(event)
      },
      [handle_value_change_debounced]
    )

    const show_value = useMemo(() => {
      return !(
        where_item.operator === 'IS NULL' ||
        where_item.operator === 'IS NOT NULL'
      )
    }, [where_item.operator])

    return (
      <div
        className={get_string_from_object({
          'filter-item': true,
          visible: is_visible
        })}>
        <div className='filter-item-left'>
          <div className='filter-item-left-column'>
            {column_item.column_title || column_item.column_id}
          </div>
          <div className='filter-item-left-operator'>
            <FormControl>
              <InputLabel id='operator-label'>Operator</InputLabel>
              <Select
                size='small'
                value={where_item.operator}
                onChange={handle_operator_change}
                label='Operator'
                labelId='operator-label'
                variant='outlined'
                defaultValue={OPERATOR_MENU_DEFAULT_VALUE}>
                {OPERATOR_MENU_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div className='filter-item-left-value'>
            <TextField
              size='small'
              label='Value'
              variant='outlined'
              disabled={!show_value}
              value={filter_value}
              onChange={handle_value_change}
            />
          </div>
        </div>
        <div className='filter-item-right'>
          <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
            <div>
              <IconButton
                className='filter-item-right-action'
                ref={anchor_el}
                onClick={() => set_misc_menu_open(!misc_menu_open)}>
                <MoreHorizIcon />
              </IconButton>
              <Popper
                className='misc-menu'
                open={misc_menu_open}
                anchorEl={anchor_el.current}
                placement={MISC_MENU_DEFAULT_PLACEMENT}>
                <div>
                  <div className='misc-menu-item' onClick={handle_remove_click}>
                    <div className='misc-menu-item-icon'>
                      <DeleteIcon size='small' />
                    </div>
                    <div className='misc-menu-item-text'>Remove</div>
                  </div>
                </div>
              </Popper>
            </div>
          </ClickAwayListener>
        </div>
      </div>
    )
  }
)

FilterItem.displayName = 'FilterItem'

FilterItem.propTypes = {
  column_item: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  is_visible: PropTypes.bool.isRequired
}

const FilterControlItem = React.memo(
  ({
    column_item,
    table_state,
    on_table_state_change,
    is_visible,
    depth = 0
  }) => {
    const handle_add_filter = useCallback(() => {
      const where_param = table_state.where || []
      const index = where_param.findIndex(
        (item) => item.column_id === column_item.column_id
      )
      if (index === -1) {
        on_table_state_change({
          ...table_state,
          where: [
            ...where_param,
            {
              column_id: column_item.column_id,
              operator: OPERATOR_MENU_DEFAULT_VALUE,
              value: ''
            }
          ]
        })
      } else {
        where_param.splice(index, 1)
        on_table_state_change({
          ...table_state,
          where: where_param
        })
      }
    }, [column_item.column_id, on_table_state_change, table_state])

    return (
      <div
        className={get_string_from_object({
          'column-category': true,
          'column-item': true,
          shown: is_visible,
          [`column-category-depth-${depth}`]: true
        })}>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column_item.data_type} />
        </div>
        <div className='column-name'>
          {column_item.column_title || column_item.column_id}
        </div>
        <div onClick={handle_add_filter} className='column-action'>
          {is_visible ? 'Remove Filter' : 'Add Filter'}
        </div>
      </div>
    )
  }
)

FilterControlItem.displayName = 'FilterControlItem'

FilterControlItem.propTypes = {
  column_item: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  is_visible: PropTypes.bool.isRequired,
  depth: PropTypes.number
}

export default function TableFilterControls({
  table_state,
  on_table_state_change,
  all_columns,
  filter_controls_open,
  set_filter_controls_open
}) {
  console.log('TableFilterControls')
  use_trace_update('TableFilterControls', {
    table_state,
    on_table_state_change,
    all_columns
  })

  const previous_filter_text = useRef('')
  const [cached_open_categories, set_cached_open_categories] = useState({})
  const [filter_text_input, set_filter_text_input] = useState('')
  const [open_categories, set_open_categories] = useState({})
  const [menu_closing, set_menu_closing] = useState(false)
  const filter_input_ref = useRef(null)
  const [local_table_state, set_local_table_state] = useState(table_state)
  const table_state_comparison = useMemo(
    () => JSON.stringify(local_table_state) !== JSON.stringify(table_state),
    [local_table_state, table_state]
  )
  const count_children = use_count_children()

  const shown_column_index = useMemo(() => {
    const index = {}
    for (const item of local_table_state.where || []) {
      index[item.column_id] = true
    }
    return index
  }, [local_table_state])

  const tree_view_columns = useMemo(() => {
    if (!filter_text_input) {
      return group_columns_into_tree_view(all_columns)
    }
    const filtered_columns = all_columns.filter((column) =>
      fuzzy_match(filter_text_input, column.column_title || column.column_id)
    )
    return group_columns_into_tree_view(filtered_columns)
  }, [all_columns, filter_text_input])

  // update local_table_state on table_state change
  useEffect(() => {
    set_local_table_state(table_state)
  }, [table_state])

  useEffect(() => {
    if (filter_text_input.length && !previous_filter_text.current.length) {
      set_cached_open_categories({ ...open_categories })
    }

    if (filter_text_input.length === 0 && previous_filter_text.current.length) {
      set_open_categories(cached_open_categories)
    }

    previous_filter_text.current = filter_text_input
  }, [
    filter_text_input,
    tree_view_columns,
    open_categories,
    cached_open_categories
  ])

  useEffect(() => {
    if (filter_text_input.length > 0) {
      const all_open_categories = tree_view_columns.reduce((acc, column) => {
        const total_children = count_children(column.columns || [])
        if (total_children < 5) {
          acc[`/${column.header}/`] = true
          const set_descendants_visible = (parent_column, path) => {
            if (parent_column.columns) {
              parent_column.columns.forEach((child_column) => {
                const new_path = `${path}${child_column.header}/`
                acc[new_path] = true
                set_descendants_visible(child_column, new_path)
              })
            }
          }
          set_descendants_visible(column, `/${column.header}/`)
        }
        return acc
      }, {})
      set_open_categories(all_open_categories)
    }
  }, [tree_view_columns, filter_text_input])

  useEffect(() => {
    if (filter_controls_open) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          document.querySelector('.filter-controls-container').scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          })
          setTimeout(() => {
            if (filter_input_ref.current) filter_input_ref.current.focus()
          }, 400)
        } else if (filter_input_ref.current) {
          filter_input_ref.current.focus()
        }
      }, 300)
    } else {
      if (filter_input_ref.current) {
        filter_input_ref.current.blur()
      }
      set_filter_text_input('')
    }
  }, [filter_controls_open])

  const handle_menu_toggle = useCallback(() => {
    if (filter_controls_open) {
      set_menu_closing(true)
      set_filter_controls_open(false)
      setTimeout(() => {
        set_menu_closing(false)
      }, 300) // Assuming 300ms is the duration of the CSS transition
    } else {
      set_filter_controls_open(true)
    }
  }, [filter_controls_open])

  const handle_click_away = useCallback(
    (event) => {
      // handle select dropdown clicks that are outside due to portal approach
      if (event.target.tagName.toLowerCase() === 'body') {
        return
      }

      if (filter_controls_open) {
        set_menu_closing(true)
        set_filter_controls_open(false)
        setTimeout(() => {
          set_menu_closing(false)
        }, 300) // Assuming 300ms is the duration of the CSS transition
        set_filter_text_input('')
      }
    },
    [filter_controls_open]
  )

  const handle_key_down = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        handle_click_away(event)
      }
    },
    [handle_click_away]
  )

  useEffect(() => {
    if (filter_controls_open) {
      document.addEventListener('keydown', handle_key_down)
    } else {
      document.removeEventListener('keydown', handle_key_down)
    }

    return () => {
      document.removeEventListener('keydown', handle_key_down)
    }
  }, [filter_controls_open, handle_key_down])

  const toggle_category = useCallback((category_path) => {
    set_open_categories((prev) => ({
      ...prev,
      [category_path]: !prev[category_path]
    }))
  }, [])

  const render_category = useCallback(
    (category, depth = 0, base_path = '/') => {
      const category_path = `${base_path}${category.header}/`
      const is_open = open_categories[category_path] || false
      const total_children_count = count_children(category.columns || [])
      return (
        <>
          <ListItem
            disablePadding
            onClick={() => toggle_category(category_path)}
            className={`column-category column-category-depth-${depth}`}>
            <KeyboardArrowRightIcon
              style={{ transform: is_open ? 'rotate(90deg)' : 'none' }}
            />
            <ListItemText primary={category.header} />
            <Badge badgeContent={total_children_count} color='primary' />
          </ListItem>
          <Collapse in={is_open} timeout='auto' unmountOnExit>
            <List component='div' disablePadding>
              {category.columns &&
                category.columns.map((sub_category) =>
                  sub_category.columns ? (
                    render_category(sub_category, depth + 1, category_path)
                  ) : (
                    <FilterControlItem
                      key={sub_category.header}
                      depth={depth + 1}
                      column_item={sub_category}
                      is_visible={Boolean(
                        shown_column_index[sub_category.column_id]
                      )}
                      table_state={local_table_state}
                      on_table_state_change={(new_table_state) => {
                        set_local_table_state(new_table_state)
                      }}
                    />
                  )
                )}
            </List>
          </Collapse>
        </>
      )
    },
    [
      count_children,
      open_categories,
      shown_column_index,
      local_table_state,
      toggle_category
    ]
  )

  const parent_ref = useRef()

  const row_virtualizer = useVirtualizer({
    count: tree_view_columns.length,
    getScrollElement: () => parent_ref.current,
    estimateSize: () => 35,
    overscan: 5
  })

  const handle_apply_click = useCallback(() => {
    on_table_state_change(local_table_state)
  }, [local_table_state, on_table_state_change])

  const handle_discard_click = useCallback(() => {
    set_local_table_state(table_state)
  }, [table_state])

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'filter-controls-container': true,
          '-open': filter_controls_open,
          '-closing': menu_closing
        })}
        tabIndex={0}>
        <Badge
          badgeContent={(local_table_state.where || []).length}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          color='primary'>
          <div
            onClick={handle_menu_toggle}
            className='table-expanding-control-button'>
            <FilterListIcon />
            Filter
          </div>
        </Badge>
        {filter_controls_open && table_state_comparison && (
          <div className='filter-controls-state-buttons'>
            <div
              className='filter-controls-discard'
              onClick={handle_discard_click}>
              Discard
            </div>
            <div className='filter-controls-apply' onClick={handle_apply_click}>
              Apply
            </div>
          </div>
        )}
        {filter_controls_open && (
          <>
            <div className='table-expanding-control-input-container'>
              <TextField
                variant='outlined'
                margin='normal'
                fullWidth
                id='filter'
                label='Search columns'
                name='filter'
                size='small'
                autoComplete='off'
                value={filter_text_input}
                onChange={(e) => set_filter_text_input(e.target.value)}
                inputRef={filter_input_ref}
              />
            </div>
            {(local_table_state.where || []).length > 0 && (
              <div
                className='table-selected-filters-container'
                style={{ maxHeight: 'calc((80vh - 32px - 89px) / 2)' }}>
                <List component='div' disablePadding>
                  {(local_table_state.where || []).map((where_item) => (
                    <FilterItem
                      key={where_item.column_id}
                      column_item={{
                        column_id: where_item.column_id,
                        column_title: all_columns.find(
                          (column) => column.column_id === where_item.column_id
                        )?.column_title
                      }}
                      is_visible={true}
                      table_state={local_table_state}
                      on_table_state_change={(new_table_state) => {
                        set_local_table_state(new_table_state)
                      }}
                    />
                  ))}
                </List>
              </div>
            )}
            <div
              ref={parent_ref}
              style={{ height: '100%', overflow: 'auto', flex: 1 }}>
              <div
                className='column-category-container'
                style={{
                  height: `${row_virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}>
                {row_virtualizer.getVirtualItems().map((virtual_row) => {
                  const item = tree_view_columns[virtual_row.index]
                  return (
                    <div
                      key={virtual_row.key}
                      data-index={virtual_row.index}
                      ref={row_virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 8,
                        right: 8,
                        width: 'calc(100% - 16px)',
                        transform: `translateY(${virtual_row.start}px)`
                      }}>
                      {item.columns ? (
                        render_category(item)
                      ) : (
                        <FilterControlItem
                          key={item.header}
                          column_item={item}
                          is_visible={Boolean(
                            shown_column_index[item.column_id]
                          )}
                          table_state={local_table_state}
                          on_table_state_change={(new_table_state) => {
                            set_local_table_state(new_table_state)
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableFilterControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  all_columns: PropTypes.array.isRequired,
  filter_controls_open: PropTypes.bool.isRequired,
  set_filter_controls_open: PropTypes.func.isRequired
}
