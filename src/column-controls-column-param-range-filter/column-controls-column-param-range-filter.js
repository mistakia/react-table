import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamRangeFilter from '../column-param-range-filter'

const ColumnControlsColumnParamRangeFilter = ({
  column_param_name,
  handle_change,
  column_param_definition,
  selected_param_values,
  mixed_state = false
}) => {
  const state = {
    label: column_param_name,
    on_change: handle_change,
    min: column_param_definition.min,
    max: column_param_definition.max,
    step: column_param_definition.step,
    selected_param_values,
    mixed_state
  }

  return <ColumnParamRangeFilter {...state} />
}

ColumnControlsColumnParamRangeFilter.displayName =
  'ColumnControlsColumnParamRangeFilter'

ColumnControlsColumnParamRangeFilter.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  handle_change: PropTypes.func.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool
}

export default React.memo(ColumnControlsColumnParamRangeFilter)
