import React, { useState, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const SharedWhereParamItem = ({
  column_param_name,
  local_table_state,
  column_param_definition,
  selected_where_indexes,
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
    const where = local_table_state.where.map((column, index) => {
      if (selected_where_indexes.includes(index)) {
        const existing_params = column?.params || {}
        return {
          column_id: column.column_id,
          operator: column.operator,
          value: column.value,
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
      where
    })
  }

  const { selected_param_values, is_equal } = useMemo(() => {
    const param_values = selected_where_indexes.map(
      (index) => local_table_state.where[index]?.params?.[column_param_name]
    )

    const is_equal = param_values.every(
      (value) => JSON.stringify(value) === JSON.stringify(param_values[0])
    )
    return {
      selected_param_values: is_equal ? param_values[0] : undefined,
      is_equal
    }
  }, [local_table_state, column_param_name, selected_where_indexes])

  const param_props = {
    column_param_name,
    column_param_definition,
    selected_param_values,
    handle_change,
    mixed_state: !is_equal
  }

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return <ColumnParamSelectFilter {...param_props} />
    case TABLE_DATA_TYPES.RANGE:
      return <ColumnParamRangeFilter {...param_props} />
    default:
      return null
  }
}

SharedWhereParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  local_table_state: PropTypes.object.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  splits: PropTypes.array.isRequired
}

export default function FilterControlsSelectedColumnsParameters({
  local_table_state,
  set_local_table_state,
  selected_where_indexes,
  local_table_state_where_columns
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)

  const shared_parameters = useMemo(() => {
    if (
      local_table_state_where_columns.length === 0 ||
      selected_where_indexes.length === 0
    ) {
      return {}
    }

    const all_params = selected_where_indexes.map((index) => {
      const column = local_table_state_where_columns[index]
      return column && column.column_params
        ? Object.keys(column.column_params)
        : []
    })

    const shared_param_names = all_params.reduce((shared, params) =>
      shared.filter((param) => params.includes(param))
    )

    return shared_param_names.reduce((acc, param_name) => {
      const column = local_table_state_where_columns[selected_where_indexes[0]]
      acc[param_name] = {
        column_param_name: param_name,
        column_param_definition: column.column_params[param_name]
      }
      return acc
    }, {})
  }, [selected_where_indexes, local_table_state_where_columns])

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='action'
          onClick={() => set_visible(!visible)}
          ref={anchor_ref}>
          Set {shared_parameters.length} Parameters
        </div>
        <Popper open={visible} anchorEl={anchor_ref.current}>
          <div className='selected-columns-parameters'>
            <div className='selected-columns-parameters-header'>
              <div>
                Set parameters for {selected_where_indexes.length} selected
                {selected_where_indexes.length === 1 ? ' filter' : ' filters'}
              </div>
              <div
                className='controls-button'
                onClick={() => set_visible(false)}>
                Close
              </div>
            </div>
            <div className='selected-columns-parameters-body'>
              {Object.values(shared_parameters).map(
                ({ column_param_name, column_param_definition }) => (
                  <SharedWhereParamItem
                    key={column_param_name}
                    {...{
                      column_param_name,
                      local_table_state,
                      column_param_definition,
                      selected_where_indexes,
                      set_local_table_state,
                      splits: local_table_state.splits
                    }}
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

FilterControlsSelectedColumnsParameters.propTypes = {
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  local_table_state_where_columns: PropTypes.array.isRequired
}
