import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'

import FilterBase from '#src/filter-base'

import './column-param-personnel-group-filter.styl'

const ANY_VALUE = '__any__'

const value_object_matches_preset = (value_object, preset_value) => {
  const preset_keys = Object.keys(preset_value)
  const value_keys = Object.keys(value_object)
  if (preset_keys.length !== value_keys.length) return false
  return preset_keys.every((k) => value_object[k] === preset_value[k])
}

const find_matching_preset_index = (value_object, preset_values) =>
  preset_values.findIndex((preset) =>
    value_object_matches_preset(value_object, preset.value)
  )

const normalize_selected = (selected_param_values) => {
  if (!selected_param_values) return []
  if (Array.isArray(selected_param_values)) return selected_param_values
  return [selected_param_values]
}

const format_value_label = ({ value, column_specs }) => {
  const parts = column_specs
    .filter((spec) => value[spec.key] !== undefined)
    .map((spec) => `${value[spec.key]} ${spec.label}`)
  return parts.length ? parts.join(', ') : 'Any'
}

const ColumnParamPersonnelGroupFilter = ({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {}
}) => {
  const column_specs = column_param_definition.column_specs || []
  const preset_values = column_param_definition.preset_values || []
  const has_advanced = column_specs.some((spec) => spec.advanced)

  const normalized_prop_values = useMemo(
    () => normalize_selected(selected_param_values),
    [selected_param_values]
  )

  const [trigger_close, set_trigger_close] = useState(false)
  const [active_values, set_active_values] = useState(normalized_prop_values)
  const [custom_value, set_custom_value] = useState(() => {
    const single =
      normalized_prop_values.length === 1 ? normalized_prop_values[0] : null
    if (single && find_matching_preset_index(single, preset_values) === -1) {
      return single
    }
    return {}
  })

  useEffect(() => {
    set_active_values(normalized_prop_values)
    const single =
      normalized_prop_values.length === 1 ? normalized_prop_values[0] : null
    if (single && find_matching_preset_index(single, preset_values) === -1) {
      set_custom_value(single)
    } else {
      set_custom_value({})
    }
  }, [normalized_prop_values, preset_values])

  const is_custom = useMemo(() => {
    if (active_values.length !== 1) return false
    return find_matching_preset_index(active_values[0], preset_values) === -1
  }, [active_values, preset_values])

  const select_options_by_key = useMemo(() => {
    const result = {}
    for (const spec of column_specs) {
      const opts = []
      for (let i = spec.min; i <= spec.max; i++) opts.push(i)
      result[spec.key] = opts
    }
    return result
  }, [column_specs])

  const emit = (next_values) => {
    set_active_values(next_values)
    handle_change(next_values.length === 0 ? undefined : next_values)
  }

  const toggle_preset = (preset) => {
    const existing_index = active_values.findIndex((v) =>
      value_object_matches_preset(v, preset.value)
    )
    let next_values
    if (existing_index === -1) {
      next_values = [...active_values, { ...preset.value }]
    } else {
      next_values = active_values.filter((_, i) => i !== existing_index)
    }
    set_custom_value({})
    emit(next_values)
  }

  const update_custom_key = (key, raw_value) => {
    const next = { ...custom_value }
    if (raw_value === ANY_VALUE || raw_value === '' || raw_value === null) {
      delete next[key]
    } else {
      next[key] = Number(raw_value)
    }
    set_custom_value(next)
    if (Object.keys(next).length === 0) {
      emit([])
    } else {
      emit([next])
    }
  }

  const handle_reset = () => {
    set_custom_value({})
    emit([])
  }

  const preset_section = preset_values.length > 0 && (
    <div className='personnel-preset-section'>
      {preset_values.map((preset) => {
        const selected = active_values.some((v) =>
          value_object_matches_preset(v, preset.value)
        )
        const class_names = ['personnel-preset-chip']
        if (selected) class_names.push('selected')
        return (
          <Tooltip
            key={preset.label}
            title={preset.n ? `${preset.label} (n=${preset.n})` : preset.label}>
            <div
              className={class_names.join(' ')}
              onClick={() => toggle_preset(preset)}>
              <span>{preset.label}</span>
              {preset.n ? (
                <span className='chip-count'>{preset.n.toLocaleString()}</span>
              ) : null}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )

  const custom_source =
    is_custom && active_values.length === 1 ? active_values[0] : custom_value

  const position_inputs = (
    <div
      className={
        'personnel-position-grid' + (has_advanced ? ' has-advanced' : '')
      }>
      {column_specs.map((spec) => {
        const current = custom_source[spec.key]
        const value = current === undefined ? ANY_VALUE : String(current)
        return (
          <div className='personnel-position-input' key={spec.key}>
            <label>{spec.label}</label>
            <Select
              size='small'
              value={value}
              onChange={(event) =>
                update_custom_key(spec.key, event.target.value)
              }>
              <MenuItem value={ANY_VALUE}>Any</MenuItem>
              {select_options_by_key[spec.key].map((opt) => (
                <MenuItem key={opt} value={String(opt)}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </div>
        )
      })}
    </div>
  )

  const body = (
    <div className='column-param-personnel-group-filter'>
      <div className='column-param-filter-header'>
        <div>{column_param_definition?.label || column_param_name}</div>
        <div
          className='controls-button'
          onClick={() => set_trigger_close(!trigger_close)}>
          Close
        </div>
      </div>
      {preset_section}
      {position_inputs}
      {(active_values.length > 0 || Object.keys(custom_value).length > 0) && (
        <div className='column-param-filter-buttons'>
          <Button onClick={handle_reset}>Reset</Button>
        </div>
      )}
    </div>
  )

  const selected_label =
    active_values.length === 0
      ? 'Any'
      : active_values.length === 1
        ? format_value_label({ value: active_values[0], column_specs })
        : `${active_values.length} selected`

  return (
    <FilterBase
      label={column_param_definition?.label || column_param_name}
      selected_label={selected_label}
      body={body}
      width='12ch'
      trigger_close={trigger_close}
    />
  )
}

ColumnParamPersonnelGroupFilter.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  handle_change: PropTypes.func.isRequired,
  selected_param_values: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
}

export default ColumnParamPersonnelGroupFilter
