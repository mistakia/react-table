import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'

const FilterControlsColumnParamSelectFilter = ({
  column_param,
  where_item = {},
  set_local_table_state,
  where_index
}) => {
  const where_item_params = where_item.params || {}
  const handle_change = (values) => {
    const new_where_item = {
      ...where_item,
      params: {
        ...where_item_params,
        [column_param.param_name]: values
      }
    }

    set_local_table_state((prev_state) => ({
      ...prev_state,
      where: [
        ...prev_state.where.slice(0, where_index),
        new_where_item,
        ...prev_state.where.slice(where_index + 1)
      ]
    }))
  }

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

FilterControlsColumnParamSelectFilter.displayName =
  'FilterControlsColumnParamSelectFilter'
FilterControlsColumnParamSelectFilter.propTypes = {
  column_param: PropTypes.object.isRequired,
  where_item: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  where_index: PropTypes.number.isRequired
}

export default React.memo(FilterControlsColumnParamSelectFilter)
