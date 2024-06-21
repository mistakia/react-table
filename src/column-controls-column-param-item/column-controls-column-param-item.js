import React from 'react'
import PropTypes from 'prop-types'

import ColumnControlsColumnParamSelectFilter from '../column-controls-column-param-select-filter'
import ColumnControlsColumnParamRangeFilter from '../column-controls-column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const ColumnControlsColumnParamItem = ({
  column_param,
  column,
  set_local_table_state,
  column_index
}) => {
  const { data_type } = column_param.param_values

  const handle_change = (values) => {
    const new_column = {
      column_id: column.column_id,
      params: {
        ...column.selected_params,
        [column_param.param_name]: values
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

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return (
        <ColumnControlsColumnParamSelectFilter
          {...{ column_param, column, handle_change }}
        />
      )
    case TABLE_DATA_TYPES.RANGE:
      return (
        <ColumnControlsColumnParamRangeFilter
          {...{ column_param, column, handle_change }}
        />
      )
    default:
      return null
  }
}

ColumnControlsColumnParamItem.displayName = 'ColumnControlsColumnParamItem'
ColumnControlsColumnParamItem.propTypes = {
  column_param: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired
}

export default React.memo(ColumnControlsColumnParamItem)
