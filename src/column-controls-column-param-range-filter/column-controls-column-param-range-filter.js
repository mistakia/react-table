import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamRangeFilter from '../column-param-range-filter'

const ColumnControlsColumnParamRangeFilter = ({
  column_param,
  column,
  handle_change
}) => {
  const selected_param_values =
    column.selected_params[column_param.param_name] || []

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

ColumnControlsColumnParamRangeFilter.displayName =
  'ColumnControlsColumnParamRangeFilter'

ColumnControlsColumnParamRangeFilter.propTypes = {
  column_param: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  handle_change: PropTypes.func.isRequired
}

export default React.memo(ColumnControlsColumnParamRangeFilter)
