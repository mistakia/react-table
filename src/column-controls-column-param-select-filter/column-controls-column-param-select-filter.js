import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'

const ColumnControlsColumnParamSelectFilter = ({
  column_param,
  column,
  set_local_table_state,
  column_index
}) => {
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

  const state = {
    label: column_param.param_name,
    on_change: handle_change,
    filter_values: [],
    is_column_param_defined: Boolean(
      column.selected_params[column_param.param_name]
    )
  }

  const selected_param_values =
    column.selected_params[column_param.param_name] || []
  for (const param_value of column_param.param_values.values) {
    state.filter_values.push({
      label: param_value,
      value: param_value,
      selected: selected_param_values.includes(param_value)
    })
  }

  return <ColumnParamSelectFilter {...state} />
}

ColumnControlsColumnParamSelectFilter.displayName =
  'ColumnControlsColumnParamSelectFilter'
ColumnControlsColumnParamSelectFilter.propTypes = {
  column_param: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired
}

export default React.memo(ColumnControlsColumnParamSelectFilter)
