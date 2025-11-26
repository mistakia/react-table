import table_state_validator_instance from './table-state-validator.mjs'
import {
  validate_where_clause_value_security,
  get_where_clause_security_errors,
  SECURITY_LIMITS
} from './security-patterns.mjs'

export function validate_table_state(table_state) {
  return table_state_validator_instance.validate_table_state(table_state)
}

export function validate_where_clause(where_clause) {
  return table_state_validator_instance.validate_component(
    'where',
    where_clause
  )
}

export function validate_sort_array(sort_array) {
  return table_state_validator_instance.validate_component('sort', sort_array)
}

export function validate_columns_array(columns_array) {
  return table_state_validator_instance.validate_component(
    'columns',
    columns_array
  )
}

export function get_table_state_validation_report(table_state) {
  return table_state_validator_instance.get_validation_report(table_state)
}

export function validate_where_item_security(where_item) {
  const errors = []

  if (!where_item.operator) {
    errors.push('Operator is required')
  }

  if (!where_item.column_id) {
    errors.push('Column ID is required')
  }

  if (where_item.value !== undefined && where_item.value !== null) {
    if (!validate_where_clause_value_security(where_item.value)) {
      errors.push(...get_where_clause_security_errors(where_item.value))
    }
  }

  return { valid: errors.length === 0, errors }
}

export function is_valid_table_state_structure(table_state) {
  if (typeof table_state !== 'object' || table_state === null) {
    return false
  }

  const array_props = ['sort', 'columns', 'where', 'splits', 'prefix_columns']
  for (const prop of array_props) {
    if (table_state[prop] && !Array.isArray(table_state[prop])) {
      return false
    }
  }

  const boolean_props = [
    'disable_scatter_plot',
    'disable_column_controls',
    'disable_multi_sort'
  ]
  for (const prop of boolean_props) {
    if (
      table_state[prop] !== undefined &&
      typeof table_state[prop] !== 'boolean'
    ) {
      return false
    }
  }

  return true
}

export function create_safe_table_state(partial_state = {}) {
  const safe_state = {
    sort: [],
    columns: [],
    prefix_columns: [],
    where: [],
    splits: [],
    rank_aggregation: {},
    disable_scatter_plot: false,
    disable_column_controls: false,
    disable_multi_sort: false,
    ...partial_state
  }

  const array_props = ['sort', 'columns', 'prefix_columns', 'where', 'splits']
  for (const prop of array_props) {
    if (!Array.isArray(safe_state[prop])) {
      safe_state[prop] = []
    }
  }

  const boolean_props = [
    'disable_scatter_plot',
    'disable_column_controls',
    'disable_multi_sort'
  ]
  for (const prop of boolean_props) {
    if (typeof safe_state[prop] !== 'boolean') {
      safe_state[prop] = false
    }
  }

  if (
    typeof safe_state.rank_aggregation !== 'object' ||
    safe_state.rank_aggregation === null
  ) {
    safe_state.rank_aggregation = {}
  }

  return safe_state
}

export { SECURITY_LIMITS }
