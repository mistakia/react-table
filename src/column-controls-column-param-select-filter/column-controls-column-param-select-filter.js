import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'

const ColumnControlsColumnParamSelectFilter = ({
  column_param,
  column,
  handle_change
}) => {
  const state = {
    label: column_param.param_name,
    single: Boolean(column.column_params[column_param.param_name]?.single),
    default_value: column.column_params[column_param.param_name]?.default_value,
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
  handle_change: PropTypes.func.isRequired
}

export default React.memo(ColumnControlsColumnParamSelectFilter)
