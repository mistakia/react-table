import React from 'react'
import PropTypes from 'prop-types'

import ColumnControlsColumnParamSelectFilter from '../column-controls-column-param-select-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const ColumnControlsColumnParamItem = ({
  column_param,
  column,
  set_local_table_state,
  column_index
}) => {
  const { data_type } = column_param.param_values

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return (
        <ColumnControlsColumnParamSelectFilter
          {...{ column_param, column, set_local_table_state, column_index }}
        />
      )
    default:
      return null
  }
}

ColumnControlsColumnParamItem.displayName = 'ColumnControlsColumnParamItem'
ColumnControlsColumnParamItem.propTypes = {
  column_param: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired
}

export default React.memo(ColumnControlsColumnParamItem)
