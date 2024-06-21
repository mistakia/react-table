import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'

function FilterControlsColumnParamSelectFilter({
  column_param,
  where_item = {},
  handle_change
}) {
  const where_item_params = where_item.params || {}

  const state = {
    label: column_param.param_name,
    on_change: handle_change,
    filter_values: [],
    is_column_param_defined: Boolean(where_item_params[column_param.param_name])
  }

  const selected_param_values = where_item_params[column_param.param_name] || []
  for (const param_value of column_param.param_values.values) {
    state.filter_values.push({
      label: param_value,
      value: param_value,
      selected: selected_param_values.includes(param_value)
    })
  }

  return <ColumnParamSelectFilter {...state} />
}

FilterControlsColumnParamSelectFilter.propTypes = {
  column_param: PropTypes.object.isRequired,
  where_item: PropTypes.object.isRequired,
  handle_change: PropTypes.func.isRequired
}

export default React.memo(FilterControlsColumnParamSelectFilter)
