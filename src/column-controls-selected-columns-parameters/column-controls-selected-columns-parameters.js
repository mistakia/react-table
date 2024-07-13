import React, { useState, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import TextField from '@mui/material/TextField'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import ColumnParamBooleanFilter from '../column-param-boolean-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'
import { fuzzy_match } from '../utils'

import './column-controls-selected-columns-parameters.styl'

const SharedColumnParamItem = ({
  column_param_name,
  local_table_state,
  column_param_definition,
  selected_column_indexes,
  set_local_table_state,
  splits = []
}) => {
  if (column_param_definition?.enable_on_splits) {
    const is_enabled = splits.some((split) =>
      column_param_definition.enable_on_splits.includes(split)
    )
    if (!is_enabled) {
      return null
    }
  }
  const { data_type } = column_param_definition

  const handle_change = (values) => {
    const columns = local_table_state.columns.map((column, index) => {
      if (selected_column_indexes.includes(index)) {
        const existing_params = column?.params || {}
        return {
          column_id: typeof column === 'string' ? column : column.column_id,
          params: {
            ...existing_params,
            [column_param_name]: values
          }
        }
      }
      return column
    })

    set_local_table_state({
      ...local_table_state,
      columns
    })
  }

  const { selected_param_values, is_equal } = useMemo(() => {
    const param_values = selected_column_indexes.map(
      (index) => local_table_state.columns[index]?.params?.[column_param_name]
    )

    const is_equal = param_values.every(
      (value) => JSON.stringify(value) === JSON.stringify(param_values[0])
    )
    return {
      selected_param_values: is_equal ? param_values[0] : undefined,
      is_equal
    }
  }, [local_table_state, column_param_name])

  const param_props = {
    column_param_name,
    column_param_definition,
    selected_param_values,
    handle_change,
    mixed_state: !is_equal,
    splits
  }

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return <ColumnParamSelectFilter {...param_props} />
    case TABLE_DATA_TYPES.RANGE:
      return <ColumnParamRangeFilter {...param_props} />
    case TABLE_DATA_TYPES.BOOLEAN:
      return <ColumnParamBooleanFilter {...param_props} />
    default:
      return null
  }
}

SharedColumnParamItem.displayName = 'SharedColumnParamItem'
SharedColumnParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  local_table_state: PropTypes.object.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_column_indexes: PropTypes.array.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  splits: PropTypes.array
}

export default function ColumnControlsSelectedColumnsParameters({
  selected_column_indexes,
  local_table_state_columns,
  local_table_state,
  set_local_table_state
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)
  const [param_filter_text, set_param_filter_text] = useState('')
  const param_filter_input_ref = useRef(null)

  const shared_parameters = useMemo(() => {
    if (
      local_table_state_columns.length === 0 ||
      selected_column_indexes.length === 0
    ) {
      return {}
    }

    const all_params = selected_column_indexes.map((index) => {
      const column = local_table_state_columns[index]
      return column && column.column_params
        ? Object.keys(column.column_params)
        : []
    })

    const shared_param_names = all_params.reduce((shared, params) =>
      shared.filter((param) => params.includes(param))
    )

    return shared_param_names.reduce((acc, param_name) => {
      const column = local_table_state_columns[selected_column_indexes[0]]
      acc[param_name] = {
        column_param_name: param_name,
        column_param_definition: column.column_params[param_name]
      }
      return acc
    }, {})
  }, [selected_column_indexes, local_table_state_columns])

  const filtered_parameters = useMemo(() => {
    if (param_filter_text) {
      return Object.values(shared_parameters).filter(({ column_param_name }) =>
        fuzzy_match(param_filter_text, column_param_name)
      )
    }
    return Object.values(shared_parameters)
  }, [param_filter_text, shared_parameters])

  const handle_param_filter_change = (event) => {
    set_param_filter_text(event.target.value)
  }

  console.log({
    shared_parameters,
    filtered_parameters
  })

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='action'
          onClick={() => set_visible(!visible)}
          ref={anchor_ref}>
          Set {Object.keys(shared_parameters).length} Parameters
        </div>
        <Popper open={visible} anchorEl={anchor_ref.current}>
          <div className='selected-columns-parameters'>
            <div className='selected-columns-parameters-header'>
              <div>
                Set parameters for {selected_column_indexes.length} selected
                {selected_column_indexes.length === 1 ? ' column' : ' columns'}
              </div>
              <div
                className='controls-button'
                onClick={() => set_visible(false)}>
                Close
              </div>
            </div>
            <div className='selected-columns-parameters-body'>
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
              {filtered_parameters.map(
                ({ column_param_name, column_param_definition }) => (
                  <SharedColumnParamItem
                    key={column_param_name}
                    column_param_name={column_param_name}
                    local_table_state={local_table_state}
                    column_param_definition={column_param_definition}
                    selected_column_indexes={selected_column_indexes}
                    set_local_table_state={set_local_table_state}
                    splits={local_table_state.splits}
                  />
                )
              )}
            </div>
          </div>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

ColumnControlsSelectedColumnsParameters.propTypes = {
  selected_column_indexes: PropTypes.array.isRequired,
  local_table_state_columns: PropTypes.array.isRequired,
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired
}
