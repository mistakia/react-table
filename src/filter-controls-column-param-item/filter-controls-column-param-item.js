import React from 'react'
import PropTypes from 'prop-types'

import FilterControlsColumnParamSelectFilter from '../filter-controls-column-param-select-filter'
import FilterControlsColumnParamRangeFilter from '../filter-controls-column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const FilterControlsColumnParamItem = ({
  column_param,
  where_item,
  set_local_table_state,
  where_index
}) => {
  const { data_type } = column_param.param_values
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

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return (
        <FilterControlsColumnParamSelectFilter
          column_param={column_param}
          where_item={where_item}
          handle_change={handle_change}
        />
      )

    case TABLE_DATA_TYPES.RANGE:
      return (
        <FilterControlsColumnParamRangeFilter
          column_param={column_param}
          where_item={where_item}
          handle_change={handle_change}
        />
      )
    default:
      return null
  }
}

FilterControlsColumnParamItem.displayName = 'FilterControlsColumnParamItem'
FilterControlsColumnParamItem.propTypes = {
  column_param: PropTypes.object.isRequired,
  where_item: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  where_index: PropTypes.number.isRequired
}

export default React.memo(FilterControlsColumnParamItem)
