import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'

const ColumnControlsColumnParamSelectFilter = ({
  column_param_name,
  handle_change,
  column_param_definition,
  selected_param_values,
  mixed_state = false
}) => {
  const state = {
    label: column_param_name,
    single: Boolean(column_param_definition?.single),
    default_value: column_param_definition?.default_value,
    on_change: handle_change,
    filter_values: [],
    is_column_param_defined: Boolean(selected_param_values),
    mixed_state
  }

  for (const param_value of column_param_definition?.values || []) {
    state.filter_values.push({
      label: param_value,
      value: param_value,
      selected:
        !mixed_state && (selected_param_values || []).includes(param_value)
    })
  }

  return <ColumnParamSelectFilter {...state} />
}

ColumnControlsColumnParamSelectFilter.displayName =
  'ColumnControlsColumnParamSelectFilter'
ColumnControlsColumnParamSelectFilter.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  handle_change: PropTypes.func.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_param_values: PropTypes.array.isRequired,
  mixed_state: PropTypes.bool
}

export default React.memo(ColumnControlsColumnParamSelectFilter)
