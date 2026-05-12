import React from 'react'
import PropTypes from 'prop-types'

import ColumnParamSelectFilter from '#src/column-param-select-filter'
import ColumnParamSelectFilterWithOverrides from '#src/column-param-select-filter-with-overrides'
import ColumnParamRangeFilter from '#src/column-param-range-filter'
import ColumnParamBooleanFilter from '#src/column-param-boolean-filter'
import ColumnParamDateFilter from '#src/column-param-date-filter'
import ColumnParamObjectPresetFilter from '#src/column-param-object-preset-filter'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'

const sanitize_value = (value) => {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .filter((v) => v !== undefined && v !== null && v !== '')
  }
  return value
}

const values_equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const ParametersEditorItem = ({
  records,
  param_name,
  param_definition,
  splits = []
}) => {
  if (param_definition?.enable_on_splits) {
    const is_enabled = splits.some((split) =>
      param_definition.enable_on_splits.includes(split)
    )
    if (!is_enabled) return null
  }

  if (param_definition?.disable_on_splits && splits.length) return null

  if (!records.length) return null

  const values = records.map((record) => record.get_value(param_name))
  const first = values[0]
  const is_equal = values.every((value) => values_equal(value, first))
  const selected_param_values = is_equal ? first : undefined

  const handle_change = (next_value) => {
    const sanitized = sanitize_value(next_value)
    for (const record of records) {
      record.update(param_name, sanitized)
    }
  }

  const param_props = {
    column_param_name: param_name,
    column_param_definition: param_definition,
    selected_param_values,
    handle_change,
    mixed_state: !is_equal,
    splits
  }

  const render_content = () => {
    if (typeof param_definition.component === 'function') {
      const CustomComponent = param_definition.component
      return <CustomComponent {...param_props} />
    }

    const { data_type } = param_definition

    const single_column_record =
      records.length === 1 &&
      records[0].kind === 'column' &&
      records[0].column &&
      records[0].column_index !== undefined &&
      records[0].set_local_table_state

    if (
      data_type === TABLE_DATA_TYPES.SELECT &&
      param_definition.param_override_config &&
      single_column_record
    ) {
      return (
        <ColumnParamSelectFilterWithOverrides
          {...param_props}
          column={records[0].column}
          column_index={records[0].column_index}
          set_local_table_state={records[0].set_local_table_state}
        />
      )
    }

    switch (data_type) {
      case TABLE_DATA_TYPES.SELECT:
        return <ColumnParamSelectFilter {...param_props} />
      case TABLE_DATA_TYPES.RANGE:
        return <ColumnParamRangeFilter {...param_props} />
      case TABLE_DATA_TYPES.BOOLEAN:
        return <ColumnParamBooleanFilter {...param_props} />
      case TABLE_DATA_TYPES.DATE:
        return <ColumnParamDateFilter {...param_props} />
      case TABLE_DATA_TYPES.OBJECT_PRESET:
        return <ColumnParamObjectPresetFilter {...param_props} />
      default:
        return null
    }
  }

  const content = render_content()
  if (!content) return null
  return <div className='parameters-editor-item'>{content}</div>
}

ParametersEditorItem.displayName = 'ParametersEditorItem'
ParametersEditorItem.propTypes = {
  records: PropTypes.array.isRequired,
  param_name: PropTypes.string.isRequired,
  param_definition: PropTypes.object.isRequired,
  splits: PropTypes.array
}

export default React.memo(ParametersEditorItem)
