import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import ColumnParamBooleanFilter from '../column-param-boolean-filter'
import ColumnParamDateFilter from '../column-param-date-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const ColumnControlsColumnParamItem = ({
  column_param_name,
  column_param_definition,
  set_local_table_state,
  column_index,
  column,
  splits = []
}) => {
  if (column_param_definition?.enable_on_splits) {
    const is_enabled = splits.some((split) =>
      column_param_definition.enable_on_splits.includes(split)
    )
    if (!is_enabled) {
      return null
    }
  }

  if (column_param_definition?.disable_on_splits && splits.length) {
    return null
  }

  const { data_type } = column_param_definition

  const handle_change = (values) => {
    const new_column = {
      column_id: column.column_id,
      params: {
        ...column.selected_params,
        [column_param_name]: values
      }
    }
    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: [
        ...prev_state.columns.slice(0, column_index),
        new_column,
        ...prev_state.columns.slice(column_index + 1)
      ]
    }))
  }

  const selected_param_values = column.selected_params[column_param_name]

  const param_props = {
    column_param_name,
    column_param_definition,
    selected_param_values,
    handle_change,
    splits
  }

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return <ColumnParamSelectFilter {...param_props} />
    case TABLE_DATA_TYPES.BOOLEAN:
      return <ColumnParamBooleanFilter {...param_props} />
    case TABLE_DATA_TYPES.RANGE:
      return <ColumnParamRangeFilter {...param_props} />
    case TABLE_DATA_TYPES.DATE:
      return <ColumnParamDateFilter {...param_props} />
    default:
      return null
  }
}

ColumnControlsColumnParamItem.displayName = 'ColumnControlsColumnParamItem'
ColumnControlsColumnParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  column: PropTypes.object.isRequired,
  splits: PropTypes.array
}

export default React.memo(ColumnControlsColumnParamItem)
