import React from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'

import FilterBase from '#src/filter-base'
import { format_column_params } from '#src/utils/format-column-params.js'

export default function ColumnParamBooleanFilter({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {},
  mixed_state = false
}) {
  const label = column_param_definition?.label || column_param_name

  const filter_values = [
    { label: 'YES', value: true },
    { label: 'NO', value: false }
  ]

  const handle_select = (value) => {
    if (mixed_state || selected_param_values !== value) {
      handle_change(value)
    } else {
      handle_change(undefined)
    }
  }

  const items = filter_values.map((v) => {
    const is_selected = !mixed_state && selected_param_values === v.value
    const class_names = ['table-filter-item-dropdown-item']
    if (is_selected) class_names.push('selected')

    return (
      <div
        key={v.label}
        className={class_names.join(' ')}
        onClick={() => handle_select(v.value)}>
        <Checkbox checked={is_selected} size='small' />
        {v.label}
      </div>
    )
  })

  const selected_label = mixed_state
    ? '-'
    : format_column_params({
        column_def: {
          column_params: { [column_param_name]: column_param_definition }
        },
        column_state_params: { [column_param_name]: selected_param_values },
        variant: 'short',
        default_label: 'ALL'
      })

  const body = <div className='table-filter-item-dropdown-body'>{items}</div>

  return <FilterBase {...{ label, selected_label, body }} />
}

ColumnParamBooleanFilter.propTypes = {
  handle_change: PropTypes.func,
  column_param_name: PropTypes.string,
  column_param_definition: PropTypes.object,
  selected_param_values: PropTypes.bool,
  mixed_state: PropTypes.bool
}
