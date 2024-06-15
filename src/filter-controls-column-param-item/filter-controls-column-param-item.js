import React from 'react'
import PropTypes from 'prop-types'

import FilterControlsColumnParamSelectFilter from '../filter-controls-column-param-select-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const FilterControlsColumnParamItem = ({
  column_param,
  where_item,
  set_local_table_state,
  where_index
}) => {
  const { data_type } = column_param.param_values

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return (
        <FilterControlsColumnParamSelectFilter
          column_param={column_param}
          where_item={where_item}
          set_local_table_state={set_local_table_state}
          where_index={where_index}
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
