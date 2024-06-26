import React, { useState, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

import './column-controls-selected-columns-parameters.styl'

const SharedColumnParamItem = ({
  column_param_name,
  local_table_state,
  column_param_definition,
  selected_column_indexes,
  set_local_table_state
}) => {
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

SharedColumnParamItem.displayName = 'SharedColumnParamItem'
SharedColumnParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  local_table_state: PropTypes.object.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_column_indexes: PropTypes.array.isRequired,
  set_local_table_state: PropTypes.func.isRequired
}

export default function ColumnControlsSelectedColumnsParameters({
  selected_column_indexes,
  local_table_state_columns,
  local_table_state,
  set_local_table_state
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)

  const shared_parameters = useMemo(() => {
    if (local_table_state_columns.length === 0) {
      return {}
    }

    return selected_column_indexes
      .map((index) => {
        const column = local_table_state_columns[index]
        if (!column || !column.column_params) {
          return []
        }
        return Object.entries(column.column_params).map(
          ([column_param_name, column_param_definition]) => ({
            column_param_name,
            column_param_definition
          })
        )
      })
      .flat()
      .reduce((acc, curr) => {
        acc[curr.column_param_name] = curr
        return acc
      }, {})
  }, [selected_column_indexes, local_table_state_columns])

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
                Set parameters for {selected_column_indexes.length} selected
                {selected_column_indexes.length === 1 ? 'column' : 'columns'}
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
                  <SharedColumnParamItem
                    key={column_param_name}
                    column_param_name={column_param_name}
                    local_table_state={local_table_state}
                    column_param_definition={column_param_definition}
                    selected_column_indexes={selected_column_indexes}
                    set_local_table_state={set_local_table_state}
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
