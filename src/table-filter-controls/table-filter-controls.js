import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useContext
} from 'react'
import PropTypes from 'prop-types'
import Badge from '@mui/material/Badge'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { distance } from 'fastest-levenshtein'

import DataTypeIcon from '#src/data-type-icon'
import { CategoryTree } from '#src/category-tree'
import {
  group_columns_into_tree_view,
  fuzzy_match,
  get_string_from_object
} from '#src/utils'
import { OPERATOR_MENU_DEFAULT_VALUE } from '#src/constants.mjs'
import { table_context } from '#src/table-context'
import FilterItem from '#src/table-filter-controls-filter-item'
import FilterControlsSelectedColumnsParameters from '#src/filter-controls-selected-columns-parameters'

import './table-filter-controls.styl'

const FilterControlItem = React.memo(
  ({
    column_item,
    table_state,
    on_table_state_change,
    is_visible,
    depth = 0
  }) => {
    const { enable_duplicate_column_ids } = useContext(table_context)
    const handle_remove_filter_by_column_id = useCallback(() => {
      const where_param = table_state.where || []
      const index = where_param.findIndex(
        (item) => item.column_id === column_item.column_id
      )
      where_param.splice(index, 1)
      on_table_state_change({
        ...table_state,
        where: where_param
      })
    }, [table_state, on_table_state_change])

    const handle_add_filter = useCallback(() => {
      const where_param = table_state.where || []
      const operator = column_item.operators
        ? column_item.operators[0]
        : OPERATOR_MENU_DEFAULT_VALUE
      on_table_state_change({
        ...table_state,
        where: [
          ...where_param,
          {
            column_id: column_item.column_id,
            operator,
            value: ''
          }
        ]
      })
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
        {is_visible && (
          <div
            onClick={handle_remove_filter_by_column_id}
            className='column-action'>
            <CloseIcon />
          </div>
        )}
        {(!is_visible || enable_duplicate_column_ids) && (
          <div onClick={handle_add_filter} className='column-action'>
            <AddIcon />
          </div>
        )}
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

const TableFilterControls = ({
  filter_controls_open,
  set_filter_controls_open,
  table_state,
  on_table_state_change,
  all_columns
}) => {
  const { filters_local_table_state, set_filters_local_table_state } =
    useContext(table_context)
  const previous_filter_text = useRef('')
  const [selected_where_indexes, set_selected_where_indexes] = useState([])
  const [bulk_edit_mode, set_bulk_edit_mode] = useState(false)
  const [cached_open_categories, set_cached_open_categories] = useState({})
  const [all_columns_expanded, set_all_columns_expanded] = useState(true)
  const [filter_text_input, set_filter_text_input] = useState('')
  const [open_categories, set_open_categories] = useState({})
  const [menu_closing, set_menu_closing] = useState(false)
  const filter_input_ref = useRef(null)
  const table_state_comparison = useMemo(
    () =>
      JSON.stringify(filters_local_table_state) !== JSON.stringify(table_state),
    [filters_local_table_state, table_state]
  )
  const container_ref = useRef(null)
  const [transform, set_transform] = useState('')

  const shown_column_index = useMemo(() => {
    const index = {}
    for (const item of filters_local_table_state.where || []) {
      index[item.column_id] = true
    }
    return index
  }, [filters_local_table_state])

  const filtered_and_sorted_columns = useMemo(() => {
    if (!filter_text_input) {
      return group_columns_into_tree_view(all_columns)
    }
    return all_columns
      .filter((column) =>
        fuzzy_match(filter_text_input, column.column_title || column.column_id)
      )
      .sort((a, b) => {
        const distance_a = distance(
          filter_text_input,
          a.column_title || a.column_id
        )
        const distance_b = distance(
          filter_text_input,
          b.column_title || b.column_id
        )
        return distance_a - distance_b
      })
  }, [all_columns, filter_text_input])

  // update filters_local_table_state on table_state change
  // Only sync when the filter panel is closed to avoid overwriting pending local changes
  // (e.g., default filters added when opening the panel, or user edits in progress)
  useEffect(() => {
    if (!filter_controls_open) {
      set_filters_local_table_state(table_state)
    }
  }, [table_state, filter_controls_open])

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
    filtered_and_sorted_columns,
    open_categories,
    cached_open_categories
  ])

  useEffect(() => {
    if (filter_text_input.length > 0) {
      set_open_categories({})
    }
  }, [filtered_and_sorted_columns, filter_text_input])

  // Collapse "Available Filters" once per open transition when filters exist
  // (e.g. via a chip click that bypasses handle_menu_toggle), so the user
  // lands on "Selected Filters." Keyed off the open transition only, so a
  // subsequent user expansion is not fought.
  const did_collapse_for_open_ref = useRef(false)
  useEffect(() => {
    if (!filter_controls_open) {
      did_collapse_for_open_ref.current = false
      return
    }
    if (did_collapse_for_open_ref.current) return
    const total_filters = (filters_local_table_state.where || []).length
    if (total_filters > 0) {
      set_all_columns_expanded(false)
      did_collapse_for_open_ref.current = true
    }
  }, [
    filter_controls_open,
    filters_local_table_state,
    set_all_columns_expanded
  ])

  useEffect(() => {
    if (filter_controls_open) {
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

      if (filter_input_ref.current) {
        filter_input_ref.current.blur()
      }
      set_filter_text_input('')
    }
  }, [filter_controls_open])

  useEffect(() => {
    if (all_columns_expanded) {
      setTimeout(() => {
        if (window.innerWidth < 768) {
          setTimeout(() => {
            if (filter_input_ref.current) filter_input_ref.current.focus()
          }, 400)
        } else if (filter_input_ref.current) {
          filter_input_ref.current.focus()
        }
      }, 300)
    }
  }, [all_columns_expanded])

  const all_columns_by_id = useMemo(() => {
    const map = new Map()
    for (const c of all_columns) map.set(c.column_id, c)
    return map
  }, [all_columns])

  const seedable_where_info = useMemo(() => {
    const rows = []
    const names = []
    const visible_table_columns = [
      ...(filters_local_table_state.columns || table_state.columns || []),
      ...(filters_local_table_state.prefix_columns ||
        table_state.prefix_columns ||
        [])
    ]
    const where = filters_local_table_state.where || []
    for (const column of visible_table_columns) {
      const column_id = typeof column === 'string' ? column : column.column_id
      const column_params = typeof column === 'string' ? {} : column.params
      const already_present = where.some(
        (filter) =>
          filter.column_id === column_id &&
          (((filter.params === null ||
            filter.params === undefined ||
            Object.keys(filter.params).length === 0) &&
            (column_params === null ||
              column_params === undefined ||
              Object.keys(column_params).length === 0)) ||
            JSON.stringify(filter.params) === JSON.stringify(column_params))
      )
      if (already_present) continue
      const column_definition = all_columns_by_id.get(column_id)
      if (!column_definition || !column_definition.column_params) continue
      const operator = column_definition.operators
        ? column_definition.operators[0]
        : OPERATOR_MENU_DEFAULT_VALUE
      rows.push({ column_id, params: column_params, value: null, operator })
      names.push(column_definition.column_title || column_id)
    }
    const summary =
      names.length <= 3
        ? names.join(', ')
        : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
    const button_label =
      rows.length === 1 ? 'Add filter' : `Add ${rows.length} filters`
    return { rows, names, summary, button_label }
  }, [
    filters_local_table_state.where,
    filters_local_table_state.columns,
    filters_local_table_state.prefix_columns,
    table_state.columns,
    table_state.prefix_columns,
    all_columns_by_id
  ])

  const seedable_where_rows = seedable_where_info.rows

  const handle_add_seedable_rows = useCallback(() => {
    if (!seedable_where_rows.length) return
    set_filters_local_table_state((prev) => ({
      ...prev,
      where: [...(prev.where || []), ...seedable_where_rows]
    }))
    set_all_columns_expanded(false)
  }, [seedable_where_rows, set_filters_local_table_state])

  const handle_menu_toggle = useCallback(() => {
    if (filter_controls_open) {
      set_menu_closing(true)
      set_filter_controls_open(false)
      setTimeout(() => {
        set_menu_closing(false)
      }, 300)
    } else {
      const total_filters = (filters_local_table_state.where || []).length
      set_all_columns_expanded(total_filters === 0)
      set_filter_controls_open(true)
    }
  }, [filter_controls_open, filters_local_table_state])

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
      set_selected_where_indexes([])
      set_bulk_edit_mode(false)
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

  const render_leaf = useCallback(
    (column_item, depth) => (
      <FilterControlItem
        key={column_item.column_id}
        depth={depth}
        column_item={column_item}
        is_visible={Boolean(shown_column_index[column_item.column_id])}
        table_state={filters_local_table_state}
        on_table_state_change={(new_table_state) => {
          set_filters_local_table_state(new_table_state)
        }}
      />
    ),
    [shown_column_index, filters_local_table_state]
  )

  const handle_apply_click = useCallback(() => {
    on_table_state_change(filters_local_table_state)
  }, [filters_local_table_state, on_table_state_change])

  const handle_discard_click = useCallback(() => {
    set_filters_local_table_state(table_state)
  }, [table_state])

  const handle_remove_all_filters = useCallback(() => {
    set_filters_local_table_state({ ...filters_local_table_state, where: [] })
  }, [filters_local_table_state])

  const local_table_state_where_columns = useMemo(() => {
    const columns = []
    for (const column of filters_local_table_state.where || []) {
      const column_id = column.column_id || column.id || column.column_name
      if (column_id) {
        // TODO use key/value store
        const column_data = all_columns.find((c) => c.column_id === column_id)
        if (column_data) {
          columns.push({
            ...column_data,
            selected_params: column.params || {}
          })
        }
      }
    }
    return columns
  }, [filters_local_table_state.where, all_columns])

  const has_selectable_where_columns = useMemo(() => {
    return local_table_state_where_columns.some(
      (column) =>
        column.column_params && Object.keys(column.column_params).length
    )
  }, [local_table_state_where_columns])

  const handle_remove_selected_filters = () => {
    const new_where = filters_local_table_state.where.filter(
      (_, index) => !selected_where_indexes.includes(index)
    )
    set_filters_local_table_state({
      ...filters_local_table_state,
      where: new_where
    })
    set_selected_where_indexes([])
  }

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        ref={container_ref}
        style={{ transform }}
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'filter-controls-container': true,
          '-open': filter_controls_open,
          '-closing': menu_closing
        })}
        tabIndex={0}>
        <Badge
          badgeContent={(filters_local_table_state.where || []).length}
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
          <div className='table-control-container-state-buttons'>
            <div
              className='controls-button controls-discard'
              onClick={handle_discard_click}>
              Discard
            </div>
            <div
              className='controls-button controls-apply'
              onClick={handle_apply_click}>
              Apply
            </div>
          </div>
        )}
        {filter_controls_open && (
          <>
            {seedable_where_rows.length > 0 && (
              <div
                className='filter-seed-ribbon'
                title={seedable_where_info.names.join(', ')}>
                <span className='filter-seed-ribbon-text'>
                  <span className='filter-seed-ribbon-lead'>
                    Add filter row
                    {seedable_where_rows.length === 1 ? '' : 's'} for visible
                    parameterized column
                    {seedable_where_rows.length === 1 ? '' : 's'}:
                  </span>{' '}
                  <span className='filter-seed-ribbon-names'>
                    {seedable_where_info.summary}
                  </span>
                </span>
                <button
                  type='button'
                  className='filter-seed-ribbon-action'
                  onClick={handle_add_seedable_rows}>
                  {seedable_where_info.button_label}
                </button>
              </div>
            )}
            {(filters_local_table_state.where || []).length > 0 && (
              <div
                className='table-selected-filters-container'
                style={{
                  maxHeight: all_columns_expanded ? '0' : '100%'
                }}>
                <div className='section-header'>
                  <div style={{ display: 'flex', alignSelf: 'center' }}>
                    Selected Filters
                  </div>
                  <div style={{ display: 'flex' }}>
                    {bulk_edit_mode && has_selectable_where_columns && (
                      <>
                        <FilterControlsSelectedColumnsParameters
                          local_table_state={filters_local_table_state}
                          set_local_table_state={set_filters_local_table_state}
                          selected_where_indexes={selected_where_indexes}
                          local_table_state_where_columns={
                            local_table_state_where_columns
                          }
                        />
                        {selected_where_indexes.length > 0 && (
                          <div
                            className='action'
                            onClick={() => set_selected_where_indexes([])}>
                            Deselect All
                          </div>
                        )}
                        {selected_where_indexes.length > 0 && (
                          <div
                            className='action -destructive'
                            onClick={handle_remove_selected_filters}>
                            Remove Selected
                          </div>
                        )}
                        {selected_where_indexes.length !==
                          local_table_state_where_columns.length && (
                          <div
                            className='action'
                            onClick={() =>
                              set_selected_where_indexes(
                                local_table_state_where_columns
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
                      </>
                    )}
                    {has_selectable_where_columns && (
                      <div
                        className={get_string_from_object({
                          action: true,
                          'action-toggle': true,
                          '-active': bulk_edit_mode
                        })}
                        onClick={() => {
                          if (bulk_edit_mode) {
                            set_selected_where_indexes([])
                          }
                          set_bulk_edit_mode(!bulk_edit_mode)
                        }}>
                        {bulk_edit_mode ? 'Done' : 'Bulk Edit'}
                      </div>
                    )}
                    {!bulk_edit_mode && (
                      <div
                        className='action -destructive'
                        onClick={handle_remove_all_filters}>
                        Remove All
                      </div>
                    )}
                  </div>
                </div>
                <div className='selected-columns-container'>
                  {(filters_local_table_state.where || []).map(
                    (where_item, where_index) => (
                      <FilterItem
                        key={where_index}
                        column_definition={
                          local_table_state_where_columns[where_index]
                        }
                        table_state={filters_local_table_state}
                        {...{
                          where_index,
                          selected_where_indexes,
                          set_selected_where_indexes,
                          bulk_edit_mode,
                          local_table_state: filters_local_table_state,
                          set_local_table_state: set_filters_local_table_state
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            )}
            <div className='section-header available-columns'>
              <div style={{ display: 'flex', alignSelf: 'center' }}>
                {all_columns.length} Available Filters
              </div>
              <div
                className='action'
                onClick={() => set_all_columns_expanded(!all_columns_expanded)}>
                {all_columns_expanded ? 'Minimize' : 'Show Available Filters'}
              </div>
            </div>
            {all_columns_expanded && (
              <>
                <div className='rt-search-input'>
                  <TextField
                    variant='outlined'
                    size='small'
                    margin='none'
                    fullWidth
                    id='filter'
                    label='Search columns'
                    name='filter'
                    autoComplete='off'
                    value={filter_text_input}
                    onChange={(e) => set_filter_text_input(e.target.value)}
                    inputRef={filter_input_ref}
                  />
                </div>
                <div style={{ height: '100%', overflow: 'auto', flex: 1 }}>
                  <div className='column-category-container'>
                    {filtered_and_sorted_columns.map((item, index) => (
                      <div key={index}>
                        {filter_text_input ? (
                          <FilterControlItem
                            key={item.column_id}
                            column_item={item}
                            is_visible={Boolean(
                              shown_column_index[item.column_id]
                            )}
                            table_state={filters_local_table_state}
                            on_table_state_change={(new_table_state) => {
                              set_filters_local_table_state(new_table_state)
                            }}
                          />
                        ) : item.columns ? (
                          <CategoryTree
                            category={item}
                            open_categories={open_categories}
                            toggle_category={toggle_category}
                            render_leaf={render_leaf}
                          />
                        ) : (
                          <FilterControlItem
                            key={item.column_id}
                            column_item={item}
                            is_visible={Boolean(
                              shown_column_index[item.column_id]
                            )}
                            table_state={filters_local_table_state}
                            on_table_state_change={(new_table_state) => {
                              set_filters_local_table_state(new_table_state)
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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

export default React.memo(TableFilterControls)
