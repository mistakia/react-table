import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'

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

  const { label, min, max, step, is_single, default_value } =
    extract_column_param_properties({
      column_param_name,
      column_param_definition
    })

  const [trigger_close, set_trigger_close] = useState(null)
  const [value, set_value] = useState(
    initialize_value({
      is_single,
      selected_param_values,
      default_value,
      min,
      max
    })
  )

  const is_changed = check_if_changed({
    is_single,
    value,
    selected_param_values
  })
  const is_default = check_if_default({
    is_single,
    value,
    default_value,
    min,
    max
  })

  const preset_values = create_preset_values({
    column_param_definition,
    selected_param_values,
    mixed_state
  })

  const handle_set = () => handle_change(value)
  const handle_reset = () =>
    reset_value({
      is_single,
      set_value,
      default_value,
      min,
      max,
      handle_change
    })
  const handle_range_change = (event) => set_value(event.target.value)
  const handle_preset_select = (preset) => {
    set_value(preset.values)
    handle_change(preset.values)
  }

  const body = create_filter_body({
    label,
    trigger_close,
    set_trigger_close,
    value,
    handle_range_change,
    is_single,
    step,
    min,
    max,
    is_default,
    is_changed,
    handle_set,
    handle_reset,
    preset_values,
    handle_preset_select
  })

  const selected_label = create_selected_label({
    mixed_state,
    is_default,
    is_single,
    value,
    default_value,
    min
  })
  const width = calculate_width({ min, max, step })

  return (
    <FilterBase {...{ selected_label, body, label, width, trigger_close }} />
  )
}

function extract_column_param_properties({
  column_param_name,
  column_param_definition
}) {
  return {
    label: column_param_definition?.label || column_param_name,
    min: column_param_definition.min,
    max: column_param_definition.max,
    step: column_param_definition.step,
    is_single: column_param_definition.is_single,
    default_value: column_param_definition.default_value
  }
}

function initialize_value({
  is_single,
  selected_param_values,
  default_value,
  min,
  max
}) {
  if (!selected_param_values) {
    selected_param_values = is_single ? null : []
  }
  return is_single
    ? selected_param_values ?? default_value ?? min
    : [selected_param_values[0] ?? min, selected_param_values[1] ?? max]
}

function check_if_changed({ is_single, value, selected_param_values }) {
  return is_single
    ? value !== selected_param_values
    : value[0] !== selected_param_values[0] ||
        value[1] !== selected_param_values[1]
}

function check_if_default({ is_single, value, default_value, min, max }) {
  return is_single
    ? value === (default_value ?? min)
    : value[0] === min && value[1] === max
}

function reset_value({
  is_single,
  set_value,
  default_value,
  min,
  max,
  handle_change
}) {
  if (is_single) {
    set_value(default_value ?? min)
  } else {
    set_value([min, max])
  }
  handle_change(undefined)
}

function create_preset_values({
  column_param_definition,
  selected_param_values,
  mixed_state
}) {
  return (column_param_definition?.preset_values || []).map((preset) => ({
    label: preset.label,
    values: preset.values,
    selected:
      !mixed_state &&
      preset.values[0] === selected_param_values[0] &&
      preset.values[1] === selected_param_values[1]
  }))
}

function create_preset_items({ preset_values, handle_preset_select }) {
  return preset_values.map((preset) =>
    create_preset_item({ preset, handle_preset_select })
  )
}

function create_preset_item({ preset, handle_preset_select }) {
  const class_names = ['table-filter-item-dropdown-item']
  if (preset.selected) class_names.push('selected')

  return (
    <div
      key={preset.label}
      className={class_names.join(' ')}
      onClick={() => handle_preset_select(preset)}>
      <Checkbox checked={preset.selected} size='small' />
      <div className='table-filter-item-dropdown-item-label'>
        {preset.label}
      </div>
      <div className='table-filter-item-dropdown-item-tag'>Preset</div>
    </div>
  )
}

function create_filter_body({
  label,
  trigger_close,
  set_trigger_close,
  value,
  handle_range_change,
  is_single,
  step,
  min,
  max,
  is_default,
  is_changed,
  handle_set,
  handle_reset,
  preset_values,
  handle_preset_select
}) {
  return (
    <div className='column-param-range-filter'>
      <div className='column-param-filter-header'>
        <div>{label}</div>
        <div
          className='controls-button'
          onClick={() => set_trigger_close(!trigger_close)}>
          Close
        </div>
      </div>
      {preset_values.length > 0 && (
        <div className='table-filter-item-dropdown-section'>
          {create_preset_items({ preset_values, handle_preset_select })}
        </div>
      )}
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
}

function create_selected_label({
  mixed_state,
  is_default,
  is_single,
  value,
  default_value,
  min
}) {
  if (mixed_state && is_default) return '-'
  if (is_default) return is_single ? default_value ?? min : 'All'
  return is_single ? value : `${value[0]} to ${value[1]}`
}

function calculate_width({ min, max, step }) {
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
  return `${char_count}ch`
}

ColumnParamRangeFilter.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  handle_change: PropTypes.func.isRequired,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool
}
