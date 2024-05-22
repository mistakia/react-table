import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import DehazeIcon from '@mui/icons-material/Dehaze'

import DataTypeIcon from '../data-type-icon'
import {
  fuzzy_match,
  group_columns_into_tree_view,
  get_string_from_object,
  use_trace_update,
  use_count_children
} from '../utils'

import './table-column-controls.styl'

const COLUMN_CONTROLS_INITIAL_VISIBLE_COLUMNS = 13
const COLUMN_CONTROLS_VISIBLE_COLUMNS_THRESHOLD = 33
const COLUMN_CONTROLS_MENU_CLOSE_TIMEOUT = 300

const TableColumnItem = React.memo(
  React.forwardRef(
    (
      { column, set_column_visible, set_column_hidden, is_visible, depth = 0 },
      ref
    ) => {
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
          <Button
            size='small'
            className='column-action'
            onClick={() =>
              is_visible
                ? set_column_hidden(column.column_id)
                : set_column_visible(column.column_id)
            }>
            {is_visible ? 'Hide' : 'Show'}
          </Button>
        </div>
      )
    }
  )
)
TableColumnItem.displayName = 'TableColumnItem'
TableColumnItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_visible: PropTypes.func.isRequired,
  set_column_hidden: PropTypes.func.isRequired,
  is_visible: PropTypes.bool,
  depth: PropTypes.number
}

const SortableItem = React.memo(
  ({ column, set_column_hidden, filter_text_input }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: column.column_id
    })

    const is_drag_enabled = !filter_text_input

    const style = {
      position: 'relative',
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : null
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div className='column-item reorder'>
          <div className='column-data-type'>
            <DataTypeIcon data_type={column.data_type} />
          </div>
          <div className='column-name'>
            {column.column_title || column.column_id}
          </div>
          <Button
            size='small'
            className='column-action'
            onClick={() => set_column_hidden(column.column_id)}>
            Hide
          </Button>
          {is_drag_enabled && (
            <div className='column-drag-handle' {...listeners}>
              <DragIndicatorIcon />
            </div>
          )}
        </div>
      </div>
    )
  }
)

SortableItem.displayName = 'SortableItem'

SortableItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_hidden: PropTypes.func.isRequired,
  filter_text_input: PropTypes.string.isRequired
}

export default function TableColumnControls({
  table_state,
  table_state_columns = [],
  all_columns = [],
  set_column_visible,
  set_column_hidden,
  set_all_columns_hidden,
  on_table_state_change,
  prefix_columns = [],
  column_controls_open,
  set_column_controls_open
}) {
  console.log('TableColumnControls')
  use_trace_update('TableColumnControls', {
    table_state,
    table_state_columns,
    all_columns,
    set_column_visible,
    set_column_hidden,
    set_all_columns_hidden,
    on_table_state_change,
    prefix_columns,
    column_controls_open,
    set_column_controls_open
  })
  const parent_ref = useRef()
  const load_remaining_columns = () => set_loaded_all(true)
  const sensors = useSensors(useSensor(PointerSensor))
  const [cached_open_categories, set_cached_open_categories] = useState({})
  const [filter_text_input, set_filter_text_input] = useState('')
  const previous_filter_text = useRef('')
  const [shown_column_items, set_shown_column_items] = useState(
    (table_state_columns || []).map((column) => ({
      ...column,
      id: column.column_id
    }))
  )
  const [open_categories, set_open_categories] = useState({})
  const [closing, set_closing] = useState(false)
  const [visible_tree_view_columns, set_visible_tree_view_columns] = useState(
    []
  )
  const [loaded_all, set_loaded_all] = useState(false)
  const filter_input_ref = useRef(null)
  const count_children = use_count_children()

  const shown_column_index = useMemo(() => {
    const index = {}
    for (const column of table_state_columns) {
      index[column.column_id] = true
    }
    return index
  }, [table_state_columns])

  const tree_view_columns = useMemo(() => {
    if (!filter_text_input) {
      return group_columns_into_tree_view(all_columns)
    }
    const filtered_columns = all_columns.filter((column) =>
      fuzzy_match(filter_text_input, column.column_title || column.column_id)
    )
    return group_columns_into_tree_view(filtered_columns)
  }, [all_columns, filter_text_input])

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
      (table_state_columns || []).map((column) => ({
        ...column,
        id: column.column_id
      }))
    )
  }, [all_columns, table_state_columns])

  const was_menu_open = useRef(false)

  useEffect(() => {
    if (column_controls_open && !was_menu_open.current) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          document.querySelector('.table-column-controls').scrollIntoView({
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

  const handle_menu_toggle = useCallback(() => {
    if (column_controls_open) {
      set_closing(true)
      set_column_controls_open(false)

      setTimeout(() => {
        set_closing(false)
      }, COLUMN_CONTROLS_MENU_CLOSE_TIMEOUT)
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

      const shown_items = []
      for (const column of table_state_columns || []) {
        if (value && !fuzzy_match(value, column.column_id)) {
          continue
        }
        shown_items.push({
          ...column,
          id: column.column_id
        })
      }
      set_shown_column_items(shown_items)
      set_loaded_all(true)
    },
    [table_state_columns, tree_view_columns]
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
        const new_columns = arrayMove(table_state.columns, old_index, new_index)
        on_table_state_change({
          ...table_state,
          columns: new_columns
        })
      }
    },
    [shown_column_items, table_state, on_table_state_change]
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
        }, COLUMN_CONTROLS_MENU_CLOSE_TIMEOUT)
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
                    <TableColumnItem
                      key={sub_category.column_id}
                      column={sub_category}
                      is_visible={Boolean(
                        shown_column_index[sub_category.column_id]
                      )}
                      set_column_visible={set_column_visible}
                      set_column_hidden={set_column_hidden}
                      depth={depth + 1}
                    />
                  )
                )}
            </List>
          </Collapse>
        </>
      )
    },
    [
      open_categories,
      count_children,
      shown_column_index,
      set_column_visible,
      set_column_hidden
    ]
  )

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
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
        {column_controls_open && (
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
            <div className='column-controls-body' ref={parent_ref}>
              {prefix_columns.map((column) => (
                <div key={column.column_id} className='column-item prefix'>
                  <div className='column-data-type'>
                    <DataTypeIcon data_type={column.data_type} />
                  </div>
                  <div className='column-name'>
                    {column.column_title || column.column_id}
                  </div>
                </div>
              ))}
              <div className='section-header'>
                <div style={{ display: 'flex', alignSelf: 'center' }}>
                  Shown in table
                </div>
                <div>
                  <div
                    className='action'
                    onClick={() => set_all_columns_hidden()}>
                    Hide all
                  </div>
                </div>
              </div>
              <div className='selected-columns-container'>
                <DndContext
                  sensors={sensors}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handle_drag_end}>
                  <SortableContext items={shown_column_items}>
                    {shown_column_items.map((column) => (
                      <SortableItem
                        key={column.column_id}
                        {...{
                          column,
                          set_column_hidden,
                          filter_text_input
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <div className='section-header'>
                <div style={{ display: 'flex', alignSelf: 'center' }}>All</div>
              </div>
              <div className='column-category-container'>
                {(loaded_all
                  ? tree_view_columns
                  : visible_tree_view_columns
                ).map((item, index) => (
                  <div key={index}>
                    {item.columns ? (
                      render_category(item)
                    ) : (
                      <TableColumnItem
                        key={item.column_id}
                        column={item}
                        is_visible={Boolean(shown_column_index[item.column_id])}
                        set_column_visible={set_column_visible}
                        set_column_hidden={set_column_hidden}
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
      </div>
    </ClickAwayListener>
  )
}

TableColumnControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.array,
  set_column_visible: PropTypes.func,
  set_column_hidden: PropTypes.func,
  set_all_columns_hidden: PropTypes.func,
  on_table_state_change: PropTypes.func,
  table_state_columns: PropTypes.array,
  prefix_columns: PropTypes.array,
  column_controls_open: PropTypes.bool.isRequired,
  set_column_controls_open: PropTypes.func.isRequired
}
