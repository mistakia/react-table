import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const FilterControlsColumnParamItem = ({
  column_param_name,
  column_param_definition,
  where_item,
  set_local_table_state,
  where_index,
  splits = []
}) => {
  const { data_type } = column_param_definition
  if (column_param_definition?.enable_on_splits) {
    const is_enabled = splits.some((split) =>
      column_param_definition.enable_on_splits.includes(split)
    )
    if (!is_enabled) {
      return null
    }
  }
  const where_item_params = where_item.params || {}
  const selected_param_values = where_item_params[column_param_name]

  const handle_change = (values) => {
    const new_where_item = {
      ...where_item,
      params: {
        ...where_item_params,
        [column_param_name]: values
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

  const param_props = {
    column_param_name,
    column_param_definition,
    selected_param_values,
    handle_change
  }

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return <ColumnParamSelectFilter {...param_props} />

    case TABLE_DATA_TYPES.RANGE:
      return <ColumnParamRangeFilter {...param_props} />
    default:
      return null
  }
}

FilterControlsColumnParamItem.displayName = 'FilterControlsColumnParamItem'
FilterControlsColumnParamItem.propTypes = {
  where_item: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  where_index: PropTypes.number.isRequired,
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  splits: PropTypes.array.isRequired
}

export default React.memo(FilterControlsColumnParamItem)
