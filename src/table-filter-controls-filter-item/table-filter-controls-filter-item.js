import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { Popper } from '@mui/base/Popper'
import DeleteIcon from '@mui/icons-material/Delete'
import TextField from '@mui/material/TextField'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Button from '@mui/material/Button'

import {
  TABLE_DATA_TYPES,
  DATA_TYPE_DEFAULT_OPERATORS,
  DATA_TYPE_OPERATORS,
  OPERATOR_MENU_DEFAULT_VALUE,
  OPERATOR_MENU_OPTIONS
} from '../constants.mjs'
import FilterControlsColumnParamItem from '../filter-controls-column-param-item'

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
  column_values = [],
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
  column_values: PropTypes.array,
  show_value: PropTypes.bool.isRequired,
  data_type: PropTypes.number.isRequired
}

export default function FilterItem({
  column_definition,
  local_table_state,
  set_local_table_state,
  where_index
}) {
  const anchor_el = useRef()
  const { column_id, column_title, column_values, data_type, column_params } =
    column_definition
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
  const [misc_menu_open, set_misc_menu_open] = useState(false)

  useEffect(() => {
    return () => {
      set_misc_menu_open(false)
    }
  }, [])

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
      set_misc_menu_open(false)
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
    set_misc_menu_open(false)
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

  const show_value = useMemo(() => {
    return !(
      where_item.operator === 'IS NULL' ||
      where_item.operator === 'IS NOT NULL' ||
      where_item.operator === 'IS EMPTY' ||
      where_item.operator === 'IS NOT EMPTY'
    )
  }, [where_item.operator])

  return (
    <div className='filter-item visible'>
      <div className='filter-item-left'>
        <div className='filter-item-left-column'>
          {column_title || column_id}
        </div>
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
      <div className='filter-item-right'>
        {has_column_params && (
          <Button
            size='small'
            className='column-action'
            onClick={() => set_show_column_params(!show_column_params)}>
            {show_column_params ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Button>
        )}
        <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
          <div>
            <Button
              ref={anchor_el}
              onClick={() => set_misc_menu_open(!misc_menu_open)}>
              <MoreHorizIcon />
            </Button>
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
      {show_column_params && (
        <div className='column-params-container'>
          {Object.entries(column_params).map(([param_name, param_values]) => (
            <FilterControlsColumnParamItem
              key={param_name}
              column_param={{ param_name, param_values }}
              {...{
                where_item,
                set_local_table_state,
                where_index
              }}
            />
          ))}
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
  where_index: PropTypes.number.isRequired
}
