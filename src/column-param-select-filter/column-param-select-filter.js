import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'

import FilterBase from '../filter-base'

export default function ColumnParamSelectFilter({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {},
  mixed_state = false,
  splits = []
}) {
  const label = column_param_definition?.label || column_param_name
  const single = is_single_select({ column_param_definition, splits })
  const default_value = column_param_definition?.default_value
  const is_column_param_defined = Boolean(selected_param_values)

  const [trigger_close, set_trigger_close] = useState(null)
  const [dynamic_values, set_dynamic_values] = useState({})

  useEffect(() => {
    update_dynamic_values({ selected_param_values, set_dynamic_values })
  }, [selected_param_values])

  const preset_values = create_preset_values({
    column_param_definition,
    selected_param_values,
    mixed_state
  })
  const dynamic_filter_values = create_dynamic_values({
    column_param_definition,
    selected_param_values,
    mixed_state
  })
  const static_values = create_static_values({
    column_param_definition,
    selected_param_values,
    mixed_state
  })
  const all_filter_values = [
    ...preset_values,
    ...dynamic_filter_values,
    ...static_values
  ]

  const count = all_filter_values.filter((v) => v.selected).length
  const all_selected =
    !single && (!is_column_param_defined || count === all_filter_values.length)
  const set_null_on_all_click = !single && !default_value

  // TODO should probably always set it to null
  const handle_all_click = () => {
    const values = all_filter_values.map((i) => i.value)
    handle_change(set_null_on_all_click ? null : values)
  }

  const handle_clear_click = () => {
    handle_change([])
  }

  const handle_select = (index) => {
    if (mixed_state) {
      return handle_mixed_state_select({
        index,
        single,
        all_filter_values,
        handle_change
      })
    }

    if (all_filter_values[index].is_dynamic) {
      return handle_dynamic_select({
        index,
        all_filter_values,
        selected_param_values,
        dynamic_values,
        handle_change,
        single
      })
    }

    if (single) {
      return handle_change([all_filter_values[index].value])
    }

    if (all_filter_values[index].is_preset) {
      return handle_preset_select({
        index,
        all_filter_values,
        selected_param_values,
        handle_change
      })
    }

    handle_static_select({
      index,
      all_filter_values,
      selected_param_values,
      all_selected,
      handle_change
    })
  }

  const handle_dynamic_value_change = (dynamic_type, value) => {
    const new_value = value.trim() === '' ? null : value
    set_dynamic_values((prev) => ({
      ...prev,
      [dynamic_type]: new_value
    }))

    const new_values =
      selected_param_values?.filter(
        (v) => typeof v !== 'object' || v.dynamic_type !== dynamic_type
      ) || []

    if (new_value !== null) {
      new_values.push({ dynamic_type, value: new_value })
    }

    handle_change(new_values)
  }

  const items = create_filter_items({
    preset_values,
    dynamic_filter_values,
    static_values,
    mixed_state,
    single,
    is_column_param_defined,
    default_value,
    dynamic_values,
    handle_select,
    handle_dynamic_value_change,
    all_selected
  })

  const selected_label = create_selected_label({
    mixed_state,
    all_selected,
    single,
    is_column_param_defined,
    all_filter_values,
    default_value
  })

  const body = create_filter_body({
    single,
    handle_all_click,
    handle_clear_click,
    set_trigger_close,
    items
  })

  return <FilterBase {...{ label, selected_label, body, trigger_close }} />
}

// Helper functions

function is_single_select({ column_param_definition, splits }) {
  return (
    Boolean(column_param_definition?.single) &&
    !(
      column_param_definition?.enable_multi_on_split &&
      splits.some((split) =>
        column_param_definition?.enable_multi_on_split?.includes(split)
      )
    )
  )
}

function update_dynamic_values({ selected_param_values, set_dynamic_values }) {
  const new_dynamic_values = {}
  selected_param_values?.forEach((value) => {
    if (value && typeof value === 'object' && value.dynamic_type) {
      new_dynamic_values[value.dynamic_type] = value.value
    }
  })
  set_dynamic_values(new_dynamic_values)
}

function create_static_values({
  column_param_definition,
  selected_param_values,
  mixed_state
}) {
  return (column_param_definition?.values || []).map((param_value) => {
    const value =
      param_value.value !== undefined
        ? param_value.value
        : param_value !== null
        ? param_value
        : null
    return {
      label: param_value.label || param_value,
      value,
      selected:
        !mixed_state &&
        ((Array.isArray(selected_param_values) &&
          selected_param_values.length === 0 &&
          value === null) ||
          (Array.isArray(selected_param_values) &&
            selected_param_values.includes(value)))
    }
  })
}

function create_dynamic_values({
  column_param_definition,
  selected_param_values,
  mixed_state
}) {
  return (column_param_definition?.dynamic_values || []).map(
    (dynamic_value) => ({
      label: dynamic_value.label,
      value: dynamic_value.dynamic_type,
      is_dynamic: true,
      default_value: dynamic_value.default_value,
      has_value_field: dynamic_value.has_value_field,
      selected:
        !mixed_state &&
        selected_param_values?.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            v.dynamic_type === dynamic_value.dynamic_type
        )
    })
  )
}

function create_preset_values({
  column_param_definition,
  selected_param_values,
  mixed_state
}) {
  return (column_param_definition?.preset_values || []).map((preset) => ({
    label: preset.label,
    value: preset.values,
    is_preset: true,
    selected:
      !mixed_state &&
      preset.values.every((v) => selected_param_values?.includes(v))
  }))
}

function handle_mixed_state_select({
  index,
  single,
  all_filter_values,
  handle_change
}) {
  if (single) {
    return handle_change([all_filter_values[index].value])
  } else {
    const new_values = all_filter_values.map((v, i) => ({
      ...v,
      selected: i === index
    }))
    const filtered_values = new_values
      .filter((i) => i.selected)
      .map((i) => i.value)
    return handle_change(filtered_values)
  }
}

function handle_dynamic_select({
  index,
  all_filter_values,
  selected_param_values,
  dynamic_values,
  handle_change,
  single
}) {
  const dynamic_type = all_filter_values[index].value
  const is_currently_selected = selected_param_values?.some(
    (v) => v && typeof v === 'object' && v.dynamic_type === dynamic_type
  )

  let new_values
  if (single) {
    const dynamic_value =
      dynamic_values[dynamic_type] || all_filter_values[index].default_value
    new_values = [{ dynamic_type, value: dynamic_value }]
  } else {
    if (is_currently_selected) {
      new_values = selected_param_values.filter(
        (v) => typeof v !== 'object' || v.dynamic_type !== dynamic_type
      )
    } else {
      const dynamic_value =
        dynamic_values[dynamic_type] || all_filter_values[index].default_value
      new_values = [
        ...(selected_param_values || []),
        { dynamic_type, value: dynamic_value }
      ]
    }
  }
  return handle_change(new_values)
}

function handle_preset_select({
  index,
  all_filter_values,
  selected_param_values,
  handle_change
}) {
  const preset_values = all_filter_values[index].value
  const is_currently_selected = preset_values.every((v) =>
    selected_param_values?.includes(v)
  )

  let new_values
  if (is_currently_selected) {
    new_values = selected_param_values.filter((v) => !preset_values.includes(v))
  } else {
    new_values = [
      ...new Set([...(selected_param_values || []), ...preset_values])
    ]
  }
  return handle_change(new_values)
}

function handle_static_select({
  index,
  all_filter_values,
  selected_param_values,
  all_selected,
  handle_change
}) {
  const static_values = all_filter_values.map((v, i) =>
    index === i
      ? { ...v, selected: all_selected ? false : !v.selected }
      : all_selected
      ? { ...v, selected: true }
      : v
  )

  const new_static_values = static_values
    .filter((v) => v.selected && !v.is_dynamic)
    .map((v) => v.value)

  const existing_dynamic_values =
    selected_param_values?.filter((v) => v && typeof v === 'object') || []

  const filtered_values = [...new_static_values, ...existing_dynamic_values]

  handle_change(filtered_values)
}

function create_filter_items({
  preset_values,
  dynamic_filter_values,
  static_values,
  mixed_state,
  single,
  is_column_param_defined,
  default_value,
  dynamic_values,
  handle_select,
  handle_dynamic_value_change,
  all_selected
}) {
  const create_item = (v, index) => {
    const class_names = ['table-filter-item-dropdown-item']
    const is_selected =
      !mixed_state &&
      (v.selected ||
        all_selected ||
        (single && !is_column_param_defined && v.value === default_value) ||
        (single && !is_column_param_defined && !default_value && index === 0))
    if (is_selected) class_names.push('selected')
    if (v.className) class_names.push(v.className)

    if (v.is_dynamic) {
      return create_dynamic_item({
        v,
        index,
        class_names,
        is_selected,
        dynamic_values,
        handle_select,
        handle_dynamic_value_change
      })
    }
    return create_static_item({
      v,
      index,
      class_names,
      is_selected,
      handle_select,
      is_default_value: v.value === default_value
    })
  }

  const preset_items = preset_values.map((v, index) => create_item(v, index))
  const dynamic_items = dynamic_filter_values.map((v, index) =>
    create_item(v, preset_values.length + index)
  )
  const static_items = static_values.map((v, index) =>
    create_item(v, preset_values.length + dynamic_filter_values.length + index)
  )

  return [
    preset_items.length > 0 && (
      <div key='preset-section' className='table-filter-item-dropdown-section'>
        {preset_items}
      </div>
    ),
    <div key='other-section' className='table-filter-item-dropdown-section'>
      {[...dynamic_items, ...static_items]}
    </div>
  ]
}

function create_dynamic_item({
  v,
  index,
  class_names,
  is_selected,
  dynamic_values,
  handle_select,
  handle_dynamic_value_change
}) {
  return (
    <div
      key={v.value}
      className={class_names.join(' ')}
      onClick={() => handle_select(index)}>
      <Checkbox checked={is_selected} size='small' />
      <div className='table-filter-item-dropdown-item-label'>{v.label}</div>
      {v.has_value_field && (
        <TextField
          size='small'
          value={dynamic_values[v.value] ?? ''}
          onChange={(e) => handle_dynamic_value_change(v.value, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={v.default_value?.toString() || ''}
        />
      )}
    </div>
  )
}

function create_static_item({
  v,
  index,
  class_names,
  is_selected,
  handle_select,
  is_default_value
}) {
  return (
    <div
      key={v.is_preset ? v.label : v.value}
      className={class_names.join(' ')}
      onClick={() => handle_select(index)}>
      <Checkbox checked={is_selected} size='small' />
      <div className='table-filter-item-dropdown-item-label'>{v.label}</div>
      {is_default_value && (
        <div className='table-filter-item-dropdown-item-tag'>Default</div>
      )}
      {v.is_preset && (
        <div className='table-filter-item-dropdown-item-tag'>Preset</div>
      )}
    </div>
  )
}

function create_selected_label({
  mixed_state,
  all_selected,
  single,
  is_column_param_defined,
  all_filter_values,
  default_value
}) {
  if (mixed_state) return '-'
  if (all_selected) return 'ALL'
  if (single && !is_column_param_defined) {
    return (
      all_filter_values.find((v) => v.value === default_value)?.label ||
      all_filter_values[0]?.label
    )
  }
  return all_filter_values
    .filter((v) => v.selected)
    .map((v) => v.label)
    .join(', ')
}

function create_filter_body({
  single,
  handle_all_click,
  handle_clear_click,
  set_trigger_close,
  items
}) {
  return (
    <>
      {!single && (
        <div className='table-filter-item-dropdown-head'>
          <div className='controls-button' onClick={handle_all_click}>
            All
          </div>
          <div className='controls-button' onClick={handle_clear_click}>
            Clear
          </div>
          <div
            className='controls-button close'
            onClick={() => set_trigger_close((prev) => !prev)}>
            Close
          </div>
        </div>
      )}
      <div className='table-filter-item-dropdown-body'>{items}</div>
    </>
  )
}

ColumnParamSelectFilter.propTypes = {
  handle_change: PropTypes.func,
  column_param_name: PropTypes.string,
  column_param_definition: PropTypes.object,
  selected_param_values: PropTypes.array,
  mixed_state: PropTypes.bool,
  splits: PropTypes.array
}
