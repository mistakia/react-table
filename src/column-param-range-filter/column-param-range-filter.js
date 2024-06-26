import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'

import FilterBase from '../filter-base'

import './column-param-range-filter.styl'

export default function ColumnParamRangeFilter({
  label,
  min,
  max,
  step = 1,
  on_change = () => {},
  selected_param_values = [],
  mixed_state = false
}) {
  const [trigger_close, set_trigger_close] = useState(null)
  const [value, set_value] = useState([
    selected_param_values[0] || min,
    selected_param_values[1] || max
  ])

  const handle_set = () => {
    on_change(value)
  }

  const handle_reset = () => {
    set_value([min, max])
    on_change(undefined)
  }

  const handle_change = (event) => {
    const value = event.target.value
    set_value(value)
  }

  const is_changed =
    value[0] !== selected_param_values[0] ||
    value[1] !== selected_param_values[1]
  const is_default = value[0] === min && value[1] === max

  const body = (
    <div className='column-param-range-filter'>
      <div className='column-param-range-filter-header'>
        <div>{label}</div>
        <div
          className='controls-button'
          onClick={() => set_trigger_close(!trigger_close)}>
          Close
        </div>
      </div>
      <div className='column-param-range-filter-body'>
        <Slider
          value={value}
          onChange={handle_change}
          step={step}
          min={min}
          max={max}
        />
        {!is_default && (
          <div className='column-param-range-filter-buttons'>
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
      ? 'All'
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
  label: PropTypes.string.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  on_change: PropTypes.func.isRequired,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool
}
