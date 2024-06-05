import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import IconButton from '@mui/material/IconButton'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { Popper } from '@mui/base/Popper'
import DeleteIcon from '@mui/icons-material/Delete'
import TextField from '@mui/material/TextField'
import ClickAwayListener from '@mui/material/ClickAwayListener'

import { debounce, get_string_from_object } from '../utils'
import {
  TABLE_DATA_TYPES,
  DATA_TYPE_DEFAULT_OPERATORS,
  DATA_TYPE_OPERATORS,
  OPERATOR_MENU_DEFAULT_VALUE,
  OPERATOR_MENU_OPTIONS
} from '../constants.mjs'

const FILTER_ITEM_DEBOUNCE_DELAY = 3000
const MISC_MENU_DEFAULT_PLACEMENT = 'bottom-start'

const FilterItemOperator = ({
  where_item,
  handle_operator_change,
  data_type
}) => {
  const available_operators = DATA_TYPE_OPERATORS[data_type]
  return (
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
          defaultValue={DATA_TYPE_DEFAULT_OPERATORS[data_type]}>
          {available_operators.map((option) => (
            <MenuItem key={option} value={option}>
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

const FilterItemValue = ({
  where_item,
  filter_value,
  handle_value_change,
  column_values,
  show_value,
  data_type
}) => {
  if (!show_value) {
    return null
  }

  return (
    <div className='filter-item-left-value'>
      {data_type === TABLE_DATA_TYPES.SELECT ? (
        <FormControl>
          <InputLabel id='select-label'>Value</InputLabel>
          <Select
            size='small'
            multiple={
              where_item.operator === 'IN' || where_item.operator === 'NOT IN'
            }
            value={filter_value}
            onChange={handle_value_change}
            label='Value'
            labelId='select-label'
            variant='outlined'>
            {column_values.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          size='small'
          label='Value'
          variant='outlined'
          value={filter_value}
          onChange={handle_value_change}
        />
      )}
    </div>
  )
}

FilterItemValue.propTypes = {
  where_item: PropTypes.object.isRequired,
  filter_value: PropTypes.string.isRequired,
  handle_value_change: PropTypes.func.isRequired,
  column_values: PropTypes.array.isRequired,
  show_value: PropTypes.bool.isRequired,
  data_type: PropTypes.number.isRequired
}

export default function FilterItem({
  column_definition,
  table_state,
  on_table_state_change,
  is_visible
}) {
  const anchor_el = useRef()
  const { column_id, column_title, column_values, data_type } =
    column_definition
  const where_item = useMemo(() => {
    const where_param = table_state.where || []
    return where_param.find((item) => item.column_id === column_id) || {}
  }, [table_state, column_id])
  const [filter_value, set_filter_value] = useState(
    where_item?.value ||
      (where_item?.operator === 'IN' || where_item?.operator === 'NOT IN'
        ? []
        : '')
  )
  const [misc_menu_open, set_misc_menu_open] = useState(false)

  useEffect(() => {
    return () => {
      set_misc_menu_open(false)
    }
  }, [])

  const handle_create_filter = useCallback(
    ({ operator = OPERATOR_MENU_DEFAULT_VALUE, value = '' }) => {
      const where_param = JSON.parse(JSON.stringify(table_state.where || []))
      where_param.push({
        column_id,
        operator,
        value
      })
      on_table_state_change({
        ...table_state,
        where: where_param
      })
      set_misc_menu_open(false)
    },
    [column_id, on_table_state_change, table_state]
  )

  const handle_remove_click = useCallback(() => {
    const where_param = JSON.parse(JSON.stringify(table_state.where || []))
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
      const where_param = JSON.parse(JSON.stringify(table_state.where || []))
      const index = where_param.findIndex(
        (item) => item.column_id === where_item.column_id
      )

      if (index === -1) {
        return handle_create_filter({
          operator: event.target.value
        })
      }

      if (event.target.value === 'IN' || event.target.value === 'NOT IN') {
        where_param[index].value = []
          .concat(where_param[index].value)
          .filter(Boolean)
        set_filter_value(where_param[index].value)
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

  const handle_value_change_main = useMemo(
    () => (event) => {
      const { value } = event.target
      const where_param = JSON.parse(JSON.stringify(table_state.where || []))
      const index = where_param.findIndex(
        (item) => item.column_id === where_item.column_id
      )

      if (index === -1) {
        return handle_create_filter({
          value
        })
      }

      where_param[index].value = value

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
    () => debounce(handle_value_change_main, FILTER_ITEM_DEBOUNCE_DELAY),
    [handle_value_change_main]
  )

  const handle_value_change = useCallback(
    (event) => {
      set_filter_value(event.target.value)
      if (data_type === TABLE_DATA_TYPES.SELECT) {
        handle_value_change_main(event)
      } else {
        handle_value_change_debounced(event)
      }
    },
    [data_type, handle_value_change_debounced]
  )

  const show_value = useMemo(() => {
    return !(
      where_item.operator === 'IS NULL' ||
      where_item.operator === 'IS NOT NULL' ||
      where_item.operator === 'IS EMPTY' ||
      where_item.operator === 'IS NOT EMPTY'
    )
  }, [where_item.operator])

  const FilterItemLeft = () => (
    <div className='filter-item-left'>
      <div className='filter-item-left-column'>{column_title || column_id}</div>
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
          show_value,
          data_type
        }}
      />
    </div>
  )

  return (
    <div
      className={get_string_from_object({
        'filter-item': true,
        visible: is_visible
      })}>
      <FilterItemLeft />
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

FilterItem.displayName = 'FilterItem'

FilterItem.propTypes = {
  column_definition: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  is_visible: PropTypes.bool.isRequired
}
