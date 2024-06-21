import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamRangeFilter from '../column-param-range-filter'

function FilterControlsColumnParamRangeFilter({
  column_param,
  where_item = {},
  handle_change
}) {
  const where_item_params = where_item.params || {}

  const selected_param_values = where_item_params[column_param.param_name] || []

  const state = {
    label: column_param.param_name,
    on_change: handle_change,
    min: column_param.param_values.min,
    max: column_param.param_values.max,
    step: column_param.param_values.step,
    selected_param_values
  }

  return <ColumnParamRangeFilter {...state} />
}

FilterControlsColumnParamRangeFilter.displayName =
  'FilterControlsColumnParamRangeFilter'
FilterControlsColumnParamRangeFilter.propTypes = {
  column_param: PropTypes.object.isRequired,
  where_item: PropTypes.object,
  handle_change: PropTypes.func.isRequired
}

export default React.memo(FilterControlsColumnParamRangeFilter)
