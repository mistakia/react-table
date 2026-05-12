import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect
} from 'react'
import ParametersEditor from '#src/parameters-editor'
import PropTypes from 'prop-types'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import CloseIcon from '@mui/icons-material/Close'
import TextField from '@mui/material/TextField'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import VisibilityIcon from '@mui/icons-material/Visibility'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import { Popper } from '@mui/base/Popper'

import SelectPickerPanel, { render_icon } from '#src/select-picker-panel'

import {
  TABLE_DATA_TYPES,
  DATA_TYPE_DEFAULT_OPERATORS,
  DATA_TYPE_OPERATORS,
  OPERATOR_MENU_DEFAULT_VALUE,
  OPERATOR_MENU_OPTIONS
} from '#src/constants.mjs'
import { get_string_from_object } from '#src/utils'
import { Checkbox } from '@mui/material'

const FilterItemOperator = ({
  where_item,
  handle_operator_change,
  data_type
}) => {
  const available_operators = DATA_TYPE_OPERATORS[data_type]
  return (
    <div className='filter-item-left-operator'>
      <FormControl size='small' className='filter-item-operator-control'>
        <Select
          size='small'
          value={where_item.operator}
          onChange={handle_operator_change}
          labelId='operator-label'
          variant='outlined'
          defaultValue={DATA_TYPE_DEFAULT_OPERATORS[data_type]}
          MenuProps={{ className: 'rt-select-menu' }}>
          {available_operators.map((option) => (
            <MenuItem key={option} value={option} className='rt-menu-item'>
              {OPERATOR_MENU_OPTIONS.find((o) => o.value === option)?.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

FilterItemOperator.propTypes = {
  where_item: PropTypes.object.isRequired,
  handle_operator_change: PropTypes.func.isRequired,
  data_type: PropTypes.number.isRequired
}

// Helpers to extract metadata from column_value entries.
// Supports primitives ('BUF') and objects ({ value, label, icon, group }).
const get_column_value = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.value
    : column_value
const get_column_label = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.label
    : column_value
const get_column_icon = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.icon
    : null
const get_column_group = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.group
    : null

const FilterItemValue = ({
  where_item,
  filter_value,
  handle_value_change,
  column_values = [],
  column_value_groups,
  show_value,
  data_type
}) => {
  if (!show_value) {
    return null
  }

  if (data_type === TABLE_DATA_TYPES.SELECT) {
    const is_multi =
      where_item.operator === 'IN' || where_item.operator === 'NOT IN'
    return (
      <div className='filter-item-left-value'>
        <FilterValuePicker
          {...{
            value: filter_value,
            on_change: handle_value_change,
            column_values,
            column_value_groups,
            is_multi
          }}
        />
      </div>
    )
  }

  return (
    <div className='filter-item-left-value'>
      <TextField
        size='small'
        placeholder='Value'
        variant='outlined'
        value={filter_value}
        onChange={handle_value_change}
        className='filter-item-value-control'
      />
    </div>
  )
}

const FilterValuePicker = ({
  value,
  on_change,
  column_values,
  column_value_groups,
  is_multi
}) => {
  const anchor_ref = useRef(null)
  const [open, set_open] = useState(false)
  const [anchor_width, set_anchor_width] = useState(undefined)

  useLayoutEffect(() => {
    if (open && anchor_ref.current) {
      set_anchor_width(anchor_ref.current.offsetWidth)
    }
  }, [open])

  const selected_set = useMemo(() => {
    if (is_multi) return new Set([].concat(value).filter((v) => v !== ''))
    return new Set(value === '' || value == null ? [] : [value])
  }, [value, is_multi])

  const column_values_by_value = useMemo(() => {
    const map = new Map()
    for (const cv of column_values) map.set(get_column_value(cv), cv)
    return map
  }, [column_values])

  const items = useMemo(
    () =>
      column_values.map((cv) => {
        const v = get_column_value(cv)
        return {
          id: v,
          value: v,
          label: get_column_label(cv),
          icon: get_column_icon(cv),
          group: get_column_group(cv),
          selected: selected_set.has(v)
        }
      }),
    [column_values, selected_set]
  )

  const handle_select = useCallback(
    (item) => {
      if (is_multi) {
        const next_set = new Set(selected_set)
        if (next_set.has(item.value)) next_set.delete(item.value)
        else next_set.add(item.value)
        on_change({ target: { value: Array.from(next_set) } })
      } else {
        on_change({ target: { value: item.value } })
        set_open(false)
      }
    },
    [is_multi, selected_set, on_change]
  )

  const handle_select_all = useCallback(
    (filtered_items) => {
      if (!is_multi) return
      const merged = new Set(selected_set)
      for (const it of filtered_items) merged.add(it.value)
      on_change({ target: { value: Array.from(merged) } })
    },
    [is_multi, selected_set, on_change]
  )

  const handle_clear = useCallback(() => {
    on_change({ target: { value: is_multi ? [] : '' } })
  }, [is_multi, on_change])

  const display_entries = useMemo(() => {
    const selected = Array.from(selected_set)
    if (!selected.length) return null
    return selected.map((v) => {
      const found = column_values_by_value.get(v)
      return {
        value: v,
        label: found ? get_column_label(found) : v,
        icon: found ? get_column_icon(found) : null
      }
    })
  }, [selected_set, column_values_by_value])

  const trigger_content = useMemo(() => {
    if (!display_entries)
      return <span className='filter-item-value-placeholder'>Value</span>
    if (display_entries.length === 1) {
      const e = display_entries[0]
      return (
        <span className='rt-value-picker-trigger-entry'>
          {render_icon(e.icon, 'rt-spp-icon -trigger')}
          <span>{e.label}</span>
        </span>
      )
    }
    if (display_entries.length === 2) {
      return display_entries.map((e) => (
        <span key={e.value} className='rt-value-picker-trigger-entry'>
          {render_icon(e.icon, 'rt-spp-icon -trigger')}
          <span>{e.label}</span>
        </span>
      ))
    }
    const first = display_entries[0]
    return (
      <span className='filter-item-value-multi'>
        <span className='rt-value-picker-trigger-entry'>
          {render_icon(first.icon, 'rt-spp-icon -trigger')}
          <span>{first.label}</span>
        </span>
        <span className='filter-item-value-more'>
          +{display_entries.length - 1}
        </span>
      </span>
    )
  }, [display_entries])

  const has_groups_tree =
    Array.isArray(column_value_groups) && column_value_groups.length > 0

  return (
    <ClickAwayListener onClickAway={() => set_open(false)}>
      <div className='filter-item-value-control rt-value-picker'>
        <div
          ref={anchor_ref}
          className={get_string_from_object({
            'rt-value-picker-trigger': true,
            '-open': open,
            '-empty': !display_entries
          })}
          onClick={() => set_open(!open)}>
          <span className='rt-value-picker-trigger-text'>
            {trigger_content}
          </span>
          <KeyboardArrowDownIcon
            className='rt-value-picker-trigger-icon'
            fontSize='small'
          />
        </div>
        <Popper
          className='rt-value-picker-popper'
          open={open}
          anchorEl={anchor_ref.current}
          placement='bottom-start'
          modifiers={[
            {
              name: 'preventOverflow',
              enabled: true,
              options: { padding: 16, altAxis: true, tether: false }
            },
            { name: 'flip', enabled: true, options: { padding: 16 } }
          ]}>
          <SelectPickerPanel
            items={items}
            value_groups={column_value_groups}
            is_multi={is_multi}
            on_select={handle_select}
            on_select_all={handle_select_all}
            on_clear={handle_clear}
            width={!has_groups_tree ? anchor_width : undefined}
          />
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

FilterValuePicker.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array
  ]),
  on_change: PropTypes.func.isRequired,
  column_values: PropTypes.array.isRequired,
  column_value_groups: PropTypes.array,
  is_multi: PropTypes.bool.isRequired
}

FilterItemValue.propTypes = {
  where_item: PropTypes.object.isRequired,
  filter_value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array,
    PropTypes.number
  ]),
  handle_value_change: PropTypes.func.isRequired,
  column_values: PropTypes.array,
  column_value_groups: PropTypes.array,
  show_value: PropTypes.bool.isRequired,
  data_type: PropTypes.number.isRequired
}

export default function FilterItem({
  column_definition,
  local_table_state,
  set_local_table_state,
  where_index,
  selected_where_indexes,
  set_selected_where_indexes,
  bulk_edit_mode = false
}) {
  const {
    column_id,
    column_title,
    column_values,
    column_value_groups,
    data_type
  } = column_definition
  const where_item = useMemo(
    () => local_table_state.where?.[where_index] || {},
    [local_table_state, where_index]
  )
  const [filter_value, set_filter_value] = useState(
    where_item?.value ||
      (where_item?.operator === 'IN' || where_item?.operator === 'NOT IN'
        ? []
        : '')
  )
  const [show_column_params, set_show_column_params] = useState(false)
  const has_column_params = Boolean(column_definition.column_params)

  useEffect(() => {
    set_filter_value(
      where_item?.value ||
        (where_item?.operator === 'IN' || where_item?.operator === 'NOT IN'
          ? []
          : '')
    )
  }, [where_item])

  const editor_records = useMemo(
    () => [
      {
        id: String(where_index),
        kind: 'where',
        column_id,
        get_value: (param_name) => where_item.params?.[param_name],
        update: (param_name, value) =>
          set_local_table_state((prev) => ({
            ...prev,
            where: (prev.where || []).map((row, i) => {
              if (i !== where_index) return row
              return {
                ...row,
                params: { ...(row.params || {}), [param_name]: value }
              }
            })
          }))
      }
    ],
    [where_index, column_id, where_item, set_local_table_state]
  )

  const handle_create_filter = useCallback(
    ({ operator = OPERATOR_MENU_DEFAULT_VALUE, value = '' }) => {
      const where_param = JSON.parse(
        JSON.stringify(local_table_state.where || [])
      )
      where_param.push({
        column_id,
        operator,
        value
      })
      set_local_table_state({
        ...local_table_state,
        where: where_param
      })
    },
    [column_id, set_local_table_state, local_table_state]
  )

  const handle_remove_click = useCallback(() => {
    const where_param = JSON.parse(
      JSON.stringify(local_table_state.where || [])
    )
    where_param.splice(where_index, 1)
    set_local_table_state({
      ...local_table_state,
      where: where_param
    })
  }, [set_local_table_state, local_table_state, where_index])

  const handle_operator_change = useCallback(
    (event) => {
      const where_param = JSON.parse(
        JSON.stringify(local_table_state.where || [])
      )
      if (where_index === -1) {
        return handle_create_filter({
          operator: event.target.value
        })
      }

      if (event.target.value === 'IN' || event.target.value === 'NOT IN') {
        where_param[where_index].value = []
          .concat(where_param[where_index].value)
          .filter(Boolean)
        set_filter_value(where_param[where_index].value)
      }

      where_param[where_index].operator = event.target.value
      set_local_table_state({
        ...local_table_state,
        where: where_param
      })
    },
    [
      handle_create_filter,
      set_local_table_state,
      local_table_state,
      where_index
    ]
  )

  const handle_value_change_main = useMemo(
    () => (event) => {
      const { value } = event.target
      const where_param = JSON.parse(
        JSON.stringify(local_table_state.where || [])
      )

      if (where_index === -1) {
        return handle_create_filter({
          value
        })
      }

      where_param[where_index].value = value

      set_local_table_state({
        ...local_table_state,
        where: where_param
      })
    },
    [
      handle_create_filter,
      set_local_table_state,
      local_table_state,
      where_index
    ]
  )

  const handle_value_change = useCallback(
    (event) => {
      set_filter_value(event.target.value)
      handle_value_change_main(event)
    },
    [handle_value_change_main]
  )

  const is_column_in_table = useMemo(() => {
    const matches = (c) => {
      const cid = typeof c === 'string' ? c : c.column_id
      return cid === column_id
    }
    return (
      (local_table_state.columns || []).some(matches) ||
      (local_table_state.prefix_columns || []).some(matches)
    )
  }, [local_table_state.columns, local_table_state.prefix_columns, column_id])

  const handle_show_in_table = useCallback(() => {
    set_local_table_state((prev) => ({
      ...prev,
      columns: [...(prev.columns || []), column_id]
    }))
  }, [set_local_table_state, column_id])

  const show_value = useMemo(() => {
    return !(
      where_item.operator === 'IS NULL' ||
      where_item.operator === 'IS NOT NULL' ||
      where_item.operator === 'IS EMPTY' ||
      where_item.operator === 'IS NOT EMPTY'
    )
  }, [where_item.operator])

  const classnames = get_string_from_object({
    'filter-item': true,
    visible: true,
    'filter-item-expanded': show_column_params
  })

  return (
    <div className={classnames}>
      <div className='filter-item-left'>
        <div className='filter-item-left-column'>
          <span className='filter-item-column-title'>
            {column_title || column_id}
          </span>
        </div>
        <div className='filter-item-left-operator-and-value-container'>
          <FilterItemOperator
            {...{
              where_item,
              handle_operator_change,
              data_type
            }}
          />
          <FilterItemValue
            {...{
              where_item,
              filter_value,
              handle_value_change,
              column_values,
              column_value_groups,
              show_value,
              data_type
            }}
          />
        </div>
      </div>
      <div className='filter-item-right'>
        {is_column_in_table ? (
          <span className='filter-item-slot' aria-hidden='true' />
        ) : (
          <Tooltip
            title='Show this column in the table'
            placement='top'
            enterDelay={700}
            enterNextDelay={300}>
            <span className='filter-item-slot'>
              <IconButton
                size='small'
                className='filter-item-action filter-item-show-in-table'
                onClick={handle_show_in_table}>
                <VisibilityIcon fontSize='small' />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {bulk_edit_mode && (
          <Tooltip
            title={
              has_column_params
                ? 'Include in bulk parameter edit'
                : 'No parameters to bulk edit'
            }
            placement='top'
            enterDelay={700}
            enterNextDelay={300}>
            <span className='filter-item-slot'>
              <Checkbox
                size='small'
                className='filter-item-bulk-checkbox'
                disabled={!has_column_params}
                checked={selected_where_indexes.includes(where_index)}
                onChange={(event) => {
                  set_selected_where_indexes(
                    event.target.checked
                      ? [...selected_where_indexes, where_index]
                      : selected_where_indexes.filter(
                          (index) => index !== where_index
                        )
                  )
                }}
              />
            </span>
          </Tooltip>
        )}
        <Tooltip
          title={
            has_column_params
              ? show_column_params
                ? 'Hide parameters'
                : 'Edit parameters'
              : 'No parameters for this filter'
          }
          placement='top'
          enterDelay={700}
          enterNextDelay={300}>
          <span className='filter-item-slot'>
            <IconButton
              size='small'
              className='filter-item-action'
              disabled={!has_column_params}
              onClick={() => set_show_column_params(!show_column_params)}>
              {show_column_params ? (
                <ExpandLessIcon fontSize='small' />
              ) : (
                <ExpandMoreIcon fontSize='small' />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title='Remove filter'
          placement='top'
          enterDelay={700}
          enterNextDelay={300}>
          <span className='filter-item-slot'>
            <IconButton
              size='small'
              className='filter-item-action filter-item-remove'
              onClick={handle_remove_click}>
              <CloseIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
      </div>
      {show_column_params && (
        <div className='column-params-container'>
          <ParametersEditor
            records={editor_records}
            splits={local_table_state.splits}
            inline
          />
        </div>
      )}
    </div>
  )
}

FilterItem.displayName = 'FilterItem'

FilterItem.propTypes = {
  column_definition: PropTypes.object.isRequired,
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  where_index: PropTypes.number.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  set_selected_where_indexes: PropTypes.func.isRequired,
  bulk_edit_mode: PropTypes.bool
}
