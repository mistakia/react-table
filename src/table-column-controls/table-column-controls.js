import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useContext
} from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable'
import { DndContext, PointerSensor, useSensors, useSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import DehazeIcon from '@mui/icons-material/Dehaze'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import Checkbox from '@mui/material/Checkbox'
import Popper from '@mui/material/Popper'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

import ColumnControlsColumnParamItem from '../column-controls-column-param-item'
import ColumnControlsSelectedColumnsParameters from '../column-controls-selected-columns-parameters'
import DataTypeIcon from '../data-type-icon'
import {
  fuzzy_match,
  group_columns_into_tree_view,
  get_string_from_object,
  use_count_children,
  levenstein_distance,
  debounce
} from '../utils'
import { table_context } from '../table-context'
import { MENU_CLOSE_TIMEOUT } from '../constants.mjs'

import './table-column-controls.styl'

const COLUMN_CONTROLS_INITIAL_VISIBLE_COLUMNS = 13
const COLUMN_CONTROLS_VISIBLE_COLUMNS_THRESHOLD = 33

const ColumnControlsTableColumnItem = React.memo(
  React.forwardRef(
    (
      {
        column,
        set_column_visible,
        set_column_hidden_by_id,
        is_visible,
        depth = 0
      },
      ref
    ) => {
      const { enable_duplicate_column_ids } = useContext(table_context)
      return (
        <div
          ref={ref}
          className={get_string_from_object({
            'column-item': true,
            shown: is_visible,
            [`column-category-depth-${depth}`]: true
          })}>
          <div className='column-data-type'>
            <DataTypeIcon data_type={column.data_type} />
          </div>
          <div className='column-name'>
            {column.column_title || column.column_id}
          </div>
          {is_visible && (
            <Button
              size='small'
              className='column-action'
              onClick={() => set_column_hidden_by_id(column.column_id)}>
              <CloseIcon />
            </Button>
          )}
          {(!is_visible || enable_duplicate_column_ids) && (
            <Button
              size='small'
              className='column-action'
              onClick={() => set_column_visible(column.column_id)}>
              <AddIcon />
            </Button>
          )}
        </div>
      )
    }
  )
)
ColumnControlsTableColumnItem.displayName = 'ColumnControlsTableColumnItem'
ColumnControlsTableColumnItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_visible: PropTypes.func.isRequired,
  set_column_hidden_by_id: PropTypes.func.isRequired,
  is_visible: PropTypes.bool,
  depth: PropTypes.number
}

const ColumnControlsSortableItem = React.memo(
  ({
    all_columns,
    column,
    set_column_hidden_by_index,
    filter_text_input,
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
              {filtered_params.map(
                ([column_param_name, column_param_definition]) => (
                  <ColumnControlsColumnParamItem
                    key={column_param_name}
                    {...{
                      column,
                      set_local_table_state,
                      column_index,
                      column_param_name,
                      column_param_definition,
                      splits
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

ColumnControlsSortableItem.displayName = 'ColumnControlsSortableItem'
ColumnControlsSortableItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_hidden_by_index: PropTypes.func.isRequired,
  filter_text_input: PropTypes.string.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  selected_column_indexes: PropTypes.array.isRequired,
  set_selected_column_indexes: PropTypes.func.isRequired,
  splits: PropTypes.array,
  all_columns: PropTypes.array
}

const TableColumnControls = ({
  table_state,
  all_columns = [],
  on_table_state_change,
  prefix_columns = [],
  column_controls_open
}) => {
  const { set_column_controls_open } = useContext(table_context)
  const [local_table_state, set_local_table_state] = useState(table_state)
  const [selected_column_indexes, set_selected_column_indexes] = useState([])
  const [all_columns_expanded, set_all_columns_expanded] = useState(true)

  const load_remaining_columns = () => set_loaded_all(true)
  const sensors = useSensors(useSensor(PointerSensor))
  const [cached_open_categories, set_cached_open_categories] = useState({})
  const [filter_text_input, set_filter_text_input] = useState('')
  const previous_filter_text = useRef('')

  const [open_categories, set_open_categories] = useState({})
  const [closing, set_closing] = useState(false)
  const [visible_tree_view_columns, set_visible_tree_view_columns] = useState(
    []
  )
  const [loaded_all, set_loaded_all] = useState(false)
  const filter_input_ref = useRef(null)
  const count_children = use_count_children()

  const container_ref = useRef(null)
  const [transform, set_transform] = useState('')

  const local_table_state_columns = useMemo(() => {
    const columns = []
    for (const column of local_table_state.columns || []) {
      const is_column_id = typeof column === 'string'
      const column_id = is_column_id
        ? column
        : column.column_id || column.id || column.column_name
      if (column_id) {
        // TODO use key/value store
        const column_data = all_columns.find((c) => c.column_id === column_id)
        if (column_data) {
          columns.push({
            ...column_data,
            selected_params: is_column_id ? {} : column.params || {}
          })
        }
      }
    }
    return columns
  }, [local_table_state.columns, all_columns])

  const [shown_column_items, set_shown_column_items] = useState(
    (local_table_state_columns || []).map((column, index) => ({
      ...column,
      id: `${column.column_id}-${index}`
    }))
  )

  const set_column_visible = useCallback(
    (column_id) => {
      set_local_table_state((prev) => ({
        ...prev,
        columns: [...(prev.columns || []), column_id],
        sort: (prev.sort || []).length ? prev.sort : [{ column_id, desc: true }]
      }))
    },
    [table_state]
  )

  const set_column_hidden_by_index = useCallback(
    (table_state_columns_index) => {
      set_local_table_state((prev) => {
        const column_to_hide = prev.columns[table_state_columns_index]
        const column_id_to_hide =
          typeof column_to_hide === 'string'
            ? column_to_hide
            : column_to_hide.column_id

        const columns = prev.columns.filter(
          (column, index) => index !== table_state_columns_index
        )

        set_selected_column_indexes((prev_indexes) =>
          prev_indexes
            .filter((index) => index !== table_state_columns_index)
            .map((index) =>
              index > table_state_columns_index ? index - 1 : index
            )
        )

        if (
          columns.some(
            (column) =>
              typeof column !== 'string' &&
              column.column_id === column_id_to_hide
          )
        ) {
          return {
            ...prev,
            columns
          }
        }

        return {
          ...prev,
          columns,
          sort: (prev.sort || []).filter(
            (s) => s.column_id !== column_id_to_hide
          )
        }
      })
    },
    [set_selected_column_indexes]
  )

  const set_column_hidden_by_id = useCallback(
    (column_id) => {
      set_local_table_state((prev) => {
        const removed_indexes = []
        const new_columns = prev.columns.filter((column, index) => {
          const should_remove =
            typeof column !== 'string'
              ? column.column_id === column_id
              : column === column_id
          if (should_remove) {
            removed_indexes.push(index)
          }
          return !should_remove
        })

        set_selected_column_indexes((prev_indexes) =>
          prev_indexes
            .filter((index) => !removed_indexes.includes(index))
            .map((index) => {
              const shift = removed_indexes.filter(
                (removed) => removed < index
              ).length
              return index - shift
            })
        )

        return {
          ...prev,
          columns: new_columns,
          sort: (prev.sort || []).filter((s) => s.column_id !== column_id)
        }
      })
    },
    [set_selected_column_indexes]
  )

  const set_all_columns_hidden = useCallback(() => {
    set_selected_column_indexes([])
    set_local_table_state((prev) => ({
      ...prev,
      columns: [],
      sort: []
    }))
  }, [])

  const shown_column_index = useMemo(() => {
    const index = {}
    for (const column of local_table_state_columns) {
      index[column.column_id] = true
    }
    return index
  }, [local_table_state_columns])

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
    set_shown_column_items(
      (local_table_state_columns || []).map((column, index) => ({
        ...column,
        id: `${column.column_id}-${index}`
      }))
    )
  }, [local_table_state_columns])

  const was_menu_open = useRef(false)

  useEffect(() => {
    if (column_controls_open && !was_menu_open.current) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          setTimeout(() => {
            if (filter_input_ref.current) filter_input_ref.current.focus()
          }, 400)
        } else if (filter_input_ref.current) {
          filter_input_ref.current.focus()
        }
      }, 300)

      set_visible_tree_view_columns(
        tree_view_columns.slice(0, COLUMN_CONTROLS_INITIAL_VISIBLE_COLUMNS)
      )
      setTimeout(() => {
        set_visible_tree_view_columns(
          tree_view_columns.slice(0, COLUMN_CONTROLS_VISIBLE_COLUMNS_THRESHOLD)
        )
      }, 1250)
      set_loaded_all(
        tree_view_columns.length < COLUMN_CONTROLS_VISIBLE_COLUMNS_THRESHOLD
      )
    } else if (!column_controls_open && was_menu_open.current) {
      if (filter_input_ref.current) {
        filter_input_ref.current.blur()
      }
      set_filter_text_input('')
      set_visible_tree_view_columns([])
      set_loaded_all(false)
    }

    was_menu_open.current = column_controls_open
  }, [column_controls_open, tree_view_columns])

  useEffect(() => {
    if (column_controls_open) {
      if (container_ref.current) {
        const original_rect = container_ref.current.getBoundingClientRect()
        const scroll_left =
          window.pageXOffset || document.documentElement.scrollLeft
        const window_center_x = window.innerWidth / 2 + scroll_left
        const element_width =
          window.innerWidth < 768
            ? 0.9 * window.innerWidth
            : 0.6 * window.innerWidth
        const element_center_x =
          original_rect.left + element_width / 2 + scroll_left

        const translate_x = window_center_x - element_center_x

        set_transform(`translateX(${translate_x}px)`)
      }
    } else {
      set_transform('')
    }
  }, [column_controls_open])

  const handle_menu_toggle = useCallback(() => {
    if (column_controls_open) {
      set_closing(true)
      set_column_controls_open(false)

      setTimeout(() => {
        set_closing(false)
      }, MENU_CLOSE_TIMEOUT)
    } else {
      set_column_controls_open(true)
    }
  }, [column_controls_open])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && column_controls_open) {
        handle_menu_toggle()
      }
    }

    if (column_controls_open) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      set_selected_column_indexes([])
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [column_controls_open, handle_menu_toggle])

  const handle_filter_change = useCallback(
    (event) => {
      const { value } = event.target
      set_filter_text_input(value)
      set_loaded_all(true)
    },
    [local_table_state_columns, tree_view_columns]
  )

  const handle_drag_end = useCallback(
    (event) => {
      const { active, over } = event
      if (active.id !== over.id) {
        const old_index = shown_column_items.findIndex(
          (column) => column.id === active.id
        )
        const new_index = shown_column_items.findIndex(
          (column) => column.id === over.id
        )
        set_shown_column_items(
          arrayMove(shown_column_items, old_index, new_index)
        )
        const new_columns = arrayMove(
          local_table_state.columns,
          old_index,
          new_index
        )
        set_local_table_state({
          ...local_table_state,
          columns: new_columns
        })
      }
    },
    [shown_column_items, local_table_state]
  )

  const handle_click_away = useCallback(
    (event) => {
      if (event.target?.closest('.add-column-action-button')) {
        return
      }

      if (column_controls_open) {
        set_closing(true)
        set_column_controls_open(false)

        setTimeout(() => {
          set_closing(false)
        }, MENU_CLOSE_TIMEOUT)
      }
      set_filter_text_input('')
    },
    [column_controls_open]
  )

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
        <div key={category_path}>
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
                    <ColumnControlsTableColumnItem
                      key={sub_category.column_id}
                      column={sub_category}
                      is_visible={Boolean(
                        shown_column_index[sub_category.column_id]
                      )}
                      {...{ set_column_hidden_by_id, set_column_visible }}
                      depth={depth + 1}
                    />
                  )
                )}
            </List>
          </Collapse>
        </div>
      )
    },
    [open_categories, count_children, shown_column_index, local_table_state]
  )

  const handle_apply = useCallback(() => {
    on_table_state_change(local_table_state)
  }, [local_table_state, on_table_state_change])

  const handle_discard = useCallback(() => {
    set_local_table_state(table_state)
    set_selected_column_indexes([])
  }, [table_state])

  const is_local_table_state_changed = useMemo(() => {
    return JSON.stringify(local_table_state) !== JSON.stringify(table_state)
  }, [local_table_state, table_state])

  const has_selectable_columns = useMemo(() => {
    return local_table_state_columns.some(
      (column) =>
        column.column_params && Object.keys(column.column_params).length
    )
  }, [local_table_state_columns])

  const handle_duplicate_columns = () => {
    if (selected_column_indexes.length === 0) return

    const new_columns = [...local_table_state.columns]
    const last_selected_index = Math.max(...selected_column_indexes)

    const sorted_column_indexes = selected_column_indexes.sort((a, b) => b - a)
    sorted_column_indexes.forEach((index) => {
      const duplicate_column = new_columns[index]
      new_columns.splice(last_selected_index + 1, 0, duplicate_column)
    })

    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: new_columns
    }))
    set_selected_column_indexes([])
  }

  const handle_remove_selected_columns = () => {
    const new_columns = local_table_state.columns.filter(
      (_, index) => !selected_column_indexes.includes(index)
    )
    set_local_table_state({
      ...local_table_state,
      columns: new_columns
    })
    set_selected_column_indexes([])
  }

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        ref={container_ref}
        style={{ transform }}
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'table-column-controls': true,
          '-open': column_controls_open,
          '-closing': closing
        })}
        tabIndex={0}>
        <div
          onClick={handle_menu_toggle}
          className='table-expanding-control-button'>
          <DehazeIcon style={{ transform: 'rotate(90deg)' }} />
          Columns
        </div>
        {column_controls_open && is_local_table_state_changed && (
          <div className='table-control-container-state-buttons'>
            <div
              className='controls-button controls-discard'
              onClick={handle_discard}>
              Discard
            </div>
            <div
              className='controls-button controls-apply'
              onClick={handle_apply}>
              Apply
            </div>
          </div>
        )}
        {column_controls_open && (
          <>
            {shown_column_items.length > 0 && (
              <div
                className='table-selected-filters-container'
                style={{
                  maxHeight: all_columns_expanded
                    ? 'calc((80vh - 32px - 89px) / 2)'
                    : '100%'
                }}>
                <div className='section-header'>
                  <div style={{ display: 'flex', alignSelf: 'center' }}>
                    Shown in table
                  </div>
                  <div style={{ display: 'flex' }}>
                    {selected_column_indexes.length > 0 && (
                      <>
                        <ColumnControlsSelectedColumnsParameters
                          selected_column_indexes={selected_column_indexes}
                          local_table_state={local_table_state}
                          local_table_state_columns={local_table_state_columns}
                          set_local_table_state={set_local_table_state}
                        />
                        <div
                          className='action'
                          onClick={handle_duplicate_columns}>
                          Duplicate {selected_column_indexes.length} column
                          {selected_column_indexes.length > 1 ? 's' : ''}
                        </div>
                        <div
                          className='action'
                          onClick={() => set_selected_column_indexes([])}>
                          Deselect All
                        </div>
                        <div
                          className='action'
                          onClick={handle_remove_selected_columns}>
                          Remove Selected
                        </div>
                      </>
                    )}
                    {selected_column_indexes.length !==
                      local_table_state_columns.length &&
                      has_selectable_columns && (
                        <div
                          className='action'
                          onClick={() =>
                            set_selected_column_indexes(
                              local_table_state_columns
                                .map((column, index) => ({ column, index }))
                                .filter(
                                  ({ column }) =>
                                    column.column_params &&
                                    Object.keys(column.column_params).length
                                )
                                .map(({ index }) => index)
                            )
                          }>
                          Select All
                        </div>
                      )}
                    {local_table_state_columns.length > 0 &&
                      !selected_column_indexes.length && (
                        <div
                          className='action'
                          onClick={set_all_columns_hidden}>
                          Remove All
                        </div>
                      )}
                  </div>
                </div>
                <div className='selected-columns-container'>
                  <DndContext
                    sensors={sensors}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handle_drag_end}>
                    <SortableContext items={shown_column_items}>
                      {shown_column_items.map((column, column_index) => (
                        <ColumnControlsSortableItem
                          key={`${column.column_id}-${column_index}`}
                          {...{
                            all_columns,
                            column,
                            set_column_hidden_by_index,
                            filter_text_input,
                            set_local_table_state,
                            column_index,
                            selected_column_indexes,
                            set_selected_column_indexes,
                            splits: local_table_state.splits || []
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}
            <div className='section-header'>
              <div style={{ display: 'flex', alignSelf: 'center' }}>
                {all_columns.length} Available Columns
              </div>
              <div
                className='action'
                onClick={() => set_all_columns_expanded(!all_columns_expanded)}>
                {all_columns_expanded ? 'Minimize' : 'Show Available Columns'}
              </div>
            </div>
            {all_columns_expanded && (
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
                    onChange={handle_filter_change}
                    inputRef={filter_input_ref}
                  />
                </div>
                <div className='column-controls-body'>
                  <div className='column-category-container'>
                    {(loaded_all
                      ? tree_view_columns
                      : visible_tree_view_columns
                    ).map((item, index) => (
                      <div key={index}>
                        {item.columns ? (
                          render_category(item)
                        ) : (
                          <ColumnControlsTableColumnItem
                            key={item.column_id}
                            column={item}
                            is_visible={Boolean(
                              shown_column_index[item.column_id]
                            )}
                            {...{ set_column_visible, set_column_hidden_by_id }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {!loaded_all && (
                    <div
                      className='table-column-controls-load-all-columns'
                      onClick={load_remaining_columns}>
                      Load Remaining Columns
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableColumnControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.array,
  on_table_state_change: PropTypes.func,
  prefix_columns: PropTypes.array,
  column_controls_open: PropTypes.bool.isRequired
}

export default React.memo(TableColumnControls)
