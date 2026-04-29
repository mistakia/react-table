import { TABLE_DATA_TYPES } from '#src/constants.mjs'

export function handle_array_param_value(
  param_value,
  param_key,
  column,
  param_label
) {
  const is_range =
    column.column_params?.[param_key]?.data_type === TABLE_DATA_TYPES.RANGE

  if (is_range) {
    return handle_range_param_value(param_value, param_key, column, param_label)
  }

  const param_def = column.column_params?.[param_key]
  if (param_def?.format_param_values) {
    return param_def.format_param_values(param_value, param_def)
  }

  const column_param_labels = param_value.map((param_v) => {
    if (param_v && typeof param_v === 'object' && param_v.dynamic_type) {
      return (
        `${param_v.dynamic_type}` + (param_v.value ? ` (${param_v.value})` : '')
      )
    } else if (param_v && typeof param_v === 'object') {
      return param_v.label || param_v.value
    } else {
      return (
        column.column_params?.[param_key]?.values?.find(
          (def_v) => def_v?.value === param_v
        )?.label || param_v
      )
    }
  })
  return column_param_labels.join(', ')
}

export function handle_range_param_value(
  param_value,
  param_key,
  column,
  param_label
) {
  const low_value = Math.min(param_value[0], param_value[1])
  const high_value = Math.max(param_value[0], param_value[1])

  const column_def = column.column_params?.[param_key]
  if (column_def && high_value === column_def.max) {
    return `${param_label}: ${low_value}+`
  } else if (column_def && low_value === column_def.min) {
    return `${param_label}: <${high_value}`
  } else {
    return `${param_label}: ${low_value}-${high_value}`
  }
}

export function handle_dynamic_param_value(
  param_value,
  param_key,
  column,
  param_label
) {
  const dynamic_def = column.column_params?.[param_key]?.dynamic_values?.find(
    (dv) => dv.dynamic_type === param_value.dynamic_type
  )
  const type_label = dynamic_def?.label || param_value.dynamic_type
  return (
    `${param_label}: ${type_label}` +
    (param_value.value ? ` (${param_value.value})` : '')
  )
}

export function handle_single_param_value(
  param_value,
  param_key,
  column,
  param_label
) {
  const is_boolean =
    column.column_params?.[param_key]?.data_type === TABLE_DATA_TYPES.BOOLEAN

  if (is_boolean) {
    return `${param_label}: ${param_value ? 'YES' : 'NO'}`
  } else {
    const column_param_label =
      column.column_params?.[param_key]?.values?.find(
        (v) => v?.value === param_value
      )?.label || param_value
    return `${param_label}: ${column_param_label}`
  }
}

/**
 * Build a structured label for all params of a column.
 *
 * @param {object} options
 * @param {object} options.column       - Column definition (carries column_params)
 * @param {object} options.column_params - Runtime param values keyed by param_key
 * @param {'short'|'long'|'multiline'|undefined} options.format - Which form to return
 * @returns {{ parts: Array<{key, label, value, value_label}>, short: string, long: string, multiline: string }}
 */
export function format_column_params({ column, column_params, format } = {}) {
  const parts = []

  if (!column_params || typeof column_params !== 'object') {
    return { parts, short: '', long: '', multiline: '' }
  }

  for (const [param_key, param_value] of Object.entries(column_params)) {
    if (!param_value && param_value !== 0 && param_value !== false) {
      continue
    }

    const param_label = column?.column_params?.[param_key]?.label || param_key

    let value_label
    if (Array.isArray(param_value)) {
      value_label = handle_array_param_value(
        param_value,
        param_key,
        column || {},
        param_label
      )
    } else if (
      param_value &&
      typeof param_value === 'object' &&
      param_value.dynamic_type
    ) {
      value_label = handle_dynamic_param_value(
        param_value,
        param_key,
        column || {},
        param_label
      )
    } else {
      value_label = handle_single_param_value(
        param_value,
        param_key,
        column || {},
        param_label
      )
    }

    parts.push({
      key: param_key,
      label: param_label,
      value: param_value,
      value_label
    })
  }

  const short = parts.map((p) => p.value_label).join(', ')
  const long = parts.map((p) => p.value_label).join(' | ')
  const multiline = parts.map((p) => p.value_label).join('\n')

  return { parts, short, long, multiline }
}
