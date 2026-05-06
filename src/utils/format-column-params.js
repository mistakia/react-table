import dayjs from 'dayjs'

import { TABLE_DATA_TYPES } from '#src/constants.mjs'

// Per-param override hook: `param_def.format_value({ value, def }) => string`.
// When defined, the engine delegates value rendering to the override and
// computes `is_default` itself. The is_default deep_equal also matches when
// `value` is a single-element array of `default_value` (covers multi-select
// params whose default is a bare object, e.g. nfl_week_id).
//
// Per-param `param_def.show_key_in_short: true` opts into prefixing the value
// with `${short_label || label}: ` in the `short` variant. Use for params whose
// raw value is not self-describing (e.g., year_offset's `0`). The `long`
// variant always uses the descriptive `label` regardless of this flag.
//
// Per-param `param_def.short_label?` provides a concise prefix used only by the
// `short` variant when `show_key_in_short` is true. Falls back to `label` when
// absent. Use for params whose descriptive `label` is too verbose for chip
// context (e.g., label `Yardline (yds to end zone)` -> short_label `Yds to EZ`).
export function format_column_params({
  column_def,
  column_state_params,
  variant = 'short',
  exclude_defaults = false,
  default_label
} = {}) {
  if (!column_state_params || typeof column_state_params !== 'object') {
    return default_label ?? ''
  }

  const param_defs = column_def?.column_params || {}
  const renders = []

  for (const [param_key, value] of Object.entries(column_state_params)) {
    const param_def = param_defs[param_key] || {}
    const render = build_param_render({ param_key, value, param_def })
    if (render) renders.push(render)
  }

  const filtered = exclude_defaults
    ? renders.filter((r) => !r.is_default)
    : renders

  if (filtered.length === 0) return default_label ?? ''

  if (variant === 'long') {
    return filtered.map((r) => `${r.key_label}: ${r.value_label}`).join(', ')
  }
  return filtered
    .map((r) =>
      r.show_key_in_short
        ? `${r.short_key_label}: ${r.value_label}`
        : r.value_label
    )
    .join(' · ')
}

function build_param_render({ param_key, value, param_def }) {
  // Skip gate: null/undefined and empty arrays produce no render.
  // Bare 0 and false pass through (fixes legacy falsy-gate bugs).
  if (value == null) return null
  if (Array.isArray(value) && value.length === 0) return null

  const key_label = param_def?.label || param_key
  const short_key_label = param_def?.short_label || key_label
  const show_key_in_short = Boolean(param_def?.show_key_in_short)

  let render
  if (typeof param_def?.format_value === 'function') {
    render = {
      param_key,
      key_label,
      value_label: param_def.format_value({ value, def: param_def }),
      is_default: matches_default(value, param_def.default_value)
    }
  } else {
    switch (param_def?.data_type) {
      case TABLE_DATA_TYPES.BOOLEAN:
        render = {
          param_key,
          key_label,
          value_label: value ? 'YES' : 'NO',
          is_default: matches_default(value, param_def.default_value)
        }
        break
      case TABLE_DATA_TYPES.RANGE:
        render = render_range({ param_key, value, param_def, key_label })
        break
      case TABLE_DATA_TYPES.DATE:
        render = {
          param_key,
          key_label,
          value_label: dayjs(value).format('YYYY-MM-DD'),
          is_default: matches_default(value, param_def.default_value)
        }
        break
      case TABLE_DATA_TYPES.SELECT:
      default:
        render = render_select({ param_key, value, param_def, key_label })
    }
  }

  return render && { ...render, short_key_label, show_key_in_short }
}

function render_range({ param_key, value, param_def, key_label }) {
  const step = param_def?.step ?? 0
  const epsilon = Math.max(1e-9, step / 2)
  const { min, max } = param_def || {}

  if (param_def?.is_single) {
    const default_scalar = param_def.default_value ?? min
    const is_default =
      typeof value === 'number' && typeof default_scalar === 'number'
        ? Math.abs(value - default_scalar) < epsilon
        : value === default_scalar
    return {
      param_key,
      key_label,
      value_label: String(value),
      is_default
    }
  }

  if (!Array.isArray(value) || value.length < 2) {
    return {
      param_key,
      key_label,
      value_label: String(value),
      is_default: false
    }
  }

  const lo = Math.min(value[0], value[1])
  const hi = Math.max(value[0], value[1])
  const near_min =
    typeof min === 'number' ? Math.abs(lo - min) < epsilon : false
  const near_max =
    typeof max === 'number' ? Math.abs(hi - max) < epsilon : false

  if (near_min && near_max) {
    return { param_key, key_label, value_label: 'All', is_default: true }
  }
  if (near_max) {
    return { param_key, key_label, value_label: `${lo}+`, is_default: false }
  }
  if (near_min) {
    return { param_key, key_label, value_label: `<${hi}`, is_default: false }
  }
  return {
    param_key,
    key_label,
    value_label: `${lo}-${hi}`,
    is_default: false
  }
}

function render_select({ param_key, value, param_def, key_label }) {
  if (Array.isArray(value)) {
    const value_label = value
      .map((element) => resolve_select_element({ element, param_def }))
      .join(', ')
    return {
      param_key,
      key_label,
      value_label,
      is_default: matches_default(value, param_def?.default_value)
    }
  }

  return {
    param_key,
    key_label,
    value_label: resolve_select_element({ element: value, param_def }),
    is_default: matches_default(value, param_def?.default_value)
  }
}

function resolve_select_element({ element, param_def }) {
  if (element === null) {
    const def = (param_def?.values || []).find(
      (v) => v && typeof v === 'object' && v.value === null
    )
    return def?.label || 'None'
  }

  if (element && typeof element === 'object') {
    if (element.dynamic_type) {
      const dynamic_def = (param_def?.dynamic_values || []).find(
        (d) => d.dynamic_type === element.dynamic_type
      )
      const label = dynamic_def?.label || element.dynamic_type
      return element.value != null ? `${label} (${element.value})` : label
    }
    return element.label ?? element.value ?? String(element)
  }

  const def = (param_def?.values || []).find(
    (v) => v && typeof v === 'object' && v.value === element
  )
  return def?.label ?? String(element)
}

// Multi-select chips wrap a scalar/object default in a single-element array
// when the user explicitly picks the default. Treat that as default for the
// is_default deep_equal so exclude_defaults still strips it.
function matches_default(value, default_value) {
  if (deep_equal(value, default_value)) return true
  if (
    Array.isArray(value) &&
    value.length === 1 &&
    !Array.isArray(default_value)
  ) {
    return deep_equal(value[0], default_value)
  }
  return false
}

function deep_equal(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deep_equal(a[i], b[i])) return false
    }
    return true
  }
  const keys_a = Object.keys(a)
  const keys_b = Object.keys(b)
  if (keys_a.length !== keys_b.length) return false
  for (const key of keys_a) {
    if (!deep_equal(a[key], b[key])) return false
  }
  return true
}
