import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'

import FilterBase from '../filter-base'

export default function ColumnParamRangeFilter({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {},
  mixed_state = false
}) {
  if (!selected_param_values) {
    selected_param_values = column_param_definition.is_single ? null : []
  }

  const label = column_param_definition?.label || column_param_name
  const min = column_param_definition.min
  const max = column_param_definition.max
  const step = column_param_definition.step
  const is_single = column_param_definition.is_single
  const [trigger_close, set_trigger_close] = useState(null)
  const [value, set_value] = useState(
    is_single
      ? selected_param_values ?? column_param_definition.default_value ?? min
      : [selected_param_values[0] ?? min, selected_param_values[1] ?? max]
  )

  const handle_set = () => {
    handle_change(value)
  }

  const handle_reset = () => {
    if (is_single) {
      set_value(column_param_definition.default_value ?? min)
    } else {
      set_value([min, max])
    }
    handle_change(undefined)
  }

  const handle_range_change = (event) => {
    const value = event.target.value
    set_value(value)
  }

  const is_changed = is_single
    ? value !== selected_param_values
    : value[0] !== selected_param_values[0] ||
      value[1] !== selected_param_values[1]
  const is_default = is_single
    ? value === (column_param_definition.default_value ?? min)
    : value[0] === min && value[1] === max

  const body = (
    <div className='column-param-range-filter'>
      <div className='column-param-filter-header'>
        <div>{label}</div>
        <div
          className='controls-button'
          onClick={() => set_trigger_close(!trigger_close)}>
          Close
        </div>
      </div>
      <div className='column-param-filter-body'>
        <Slider
          value={value}
          onChange={handle_range_change}
          track={is_single ? false : 'normal'}
          step={step}
          min={min}
          max={max}
        />
        {!is_default && (
          <div className='column-param-filter-buttons'>
            {is_changed && <Button onClick={handle_set}>Save</Button>}
            <Button onClick={handle_reset}>Reset</Button>
          </div>
        )}
      </div>
    </div>
  )

  const selected_label =
    mixed_state && is_default
      ? '-'
      : is_default
      ? is_single
        ? column_param_definition.default_value ?? min
        : 'All'
      : is_single
      ? value
      : `${value[0]} to ${value[1]}`

  const potential_characters = [min.toString().length, max.toString().length]
  if (step && step !== 1) {
    const adjusted_min = min + step
    const adjusted_max = max - step
    potential_characters.push(
      adjusted_min.toString().length,
      adjusted_max.toString().length
    )
  }
  const max_length = Math.max(...potential_characters)
  const char_count = max_length * 2 + 4
  const width = `${char_count}ch`

  return (
    <FilterBase {...{ selected_label, body, label, width, trigger_close }} />
  )
}

ColumnParamRangeFilter.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  handle_change: PropTypes.func.isRequired,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool
}
