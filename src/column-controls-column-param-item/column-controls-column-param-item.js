import React from 'react'
import PropTypes from 'prop-types'

import ColumnControlsColumnParamSelectFilter from '../column-controls-column-param-select-filter'
import ColumnControlsColumnParamRangeFilter from '../column-controls-column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const ColumnControlsColumnParamItem = ({
  column_param_name,
  column_param_definition,
  set_local_table_state,
  column_index,
  column
}) => {
  const { data_type } = column_param_definition

  const handle_change = (values) => {
    const new_column = {
      column_id: column.column_id,
      params: {
        ...column.selected_params,
        [column_param_name]: values
      }
    }
    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: [
        ...prev_state.columns.slice(0, column_index),
        new_column,
        ...prev_state.columns.slice(column_index + 1)
      ]
    }))
  }

  const selected_param_values = column.selected_params[column_param_name]

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return (
        <ColumnControlsColumnParamSelectFilter
          {...{
            column_param_name,
            handle_change,
            selected_param_values,
            column_param_definition
          }}
        />
      )
    case TABLE_DATA_TYPES.RANGE:
      return (
        <ColumnControlsColumnParamRangeFilter
          {...{
            column_param_name,
            handle_change,
            selected_param_values,
            column_param_definition
          }}
        />
      )
    default:
      return null
  }
}

ColumnControlsColumnParamItem.displayName = 'ColumnControlsColumnParamItem'
ColumnControlsColumnParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  column: PropTypes.object.isRequired
}

export default React.memo(ColumnControlsColumnParamItem)
