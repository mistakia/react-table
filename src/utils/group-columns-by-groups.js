// Group items can be a column field or a group with the following schema:
// {
//   header: string, // used as a label
//   column_group: object, // column group definition or column parameters
//   columns: array of objects // just like this one or a column definition
// }

import { TABLE_DATA_TYPES } from '../constants.mjs'

export default function group_columns_by_groups(
  table_columns = [],
  table_state_columns
) {
  const root_group = {
    header: null,
    column_group: null,
    columns: []
  }

  function find_deepest_matching_group({ group, column, column_state }) {
    let deepest_group = group
    const parent_groups = []

    function traverse(current_group) {
      if (current_group.locked) {
        return
      }
      for (const child of current_group.columns) {
        if (
          child.columns &&
          !child.locked &&
          matches_group({ group: child, column, column_state })
        ) {
          parent_groups.push(current_group)
          deepest_group = child
          traverse(child)
          return
        }
      }
    }

    traverse(group)
    return { deepest_group, parent_groups }
  }

  function matches_group({ group, column, column_state }) {
    if (group.column_group) {
      return column.column_groups?.some(
        (cg) => cg.column_group_id === group.column_group.column_group_id
      )
    } else if (group.params) {
      return Object.entries(group.params).every(
        ([key, value]) =>
          JSON.stringify(column_state.params?.[key]) === JSON.stringify(value)
      )
    }
    return false
  }

  function create_group({ identifier }) {
    return {
      header: identifier.label,
      column_group:
        identifier.type === 'column_group' ? identifier.value : null,
      params: identifier.type === 'param' ? identifier.value : null,
      columns: [],
      locked: false
    }
  }

  function get_group_identifiers({
    column,
    column_state,
    parent_groups,
    table_columns,
    current_index
  }) {
    const identifiers = []

    // Add column groups to identifiers
    for (const column_group of column.column_groups || []) {
      if (!column_group.column_group_id) {
        throw new Error('column_group_id is required')
      }
      if (
        !parent_groups.some(
          (group) =>
            group.column_group?.column_group_id === column_group.column_group_id
        )
      ) {
        identifiers.push({
          type: 'column_group',
          id: column_group.column_group_id,
          label: column_group.column_group_id,
          value: column_group
        })
      }
    }

    if (column_state.params) {
      for (const [param_key, param_value] of Object.entries(
        column_state.params
      )) {
        // check if param value is not defined
        if (!param_value) {
          continue
        }

        // Check if the current parameter is not already present in any parent group
        // This prevents duplicate grouping for the same parameter
        if (
          !parent_groups.some(
            (group) =>
              group.params &&
              JSON.stringify(group.params[param_key]) ===
                JSON.stringify(param_value)
          )
        ) {
          const param_label =
            column.column_params[param_key]?.label || param_key

          let label
          if (Array.isArray(param_value)) {
            label = handle_array_param_value(
              param_value,
              param_key,
              column,
              param_label
            )
          } else if (
            typeof param_value === 'object' &&
            param_value.dynamic_type
          ) {
            label = handle_dynamic_param_value(param_value, param_label)
          } else {
            label = handle_single_param_value(
              param_value,
              param_key,
              column,
              param_label
            )
          }

          identifiers.push({
            type: 'param',
            id: `${param_key}_${JSON.stringify(param_value)}`,
            label,
            value: { [param_key]: param_value }
          })
        }
      }
    }

    // Count consecutive neighbors sharing each identifier
    const count_consecutive_neighbors = (identifier) => {
      let count = 0
      let left = current_index - 1
      let right = current_index + 1

      while (
        left >= 0 &&
        shares_identifier({ other_column: table_columns[left], identifier })
      ) {
        count++
        left--
      }
      while (
        right < table_columns.length &&
        shares_identifier({ other_column: table_columns[right], identifier })
      ) {
        count++
        right++
      }

      return count
    }

    const shares_identifier = ({ other_column, identifier }) => {
      if (identifier.type === 'column_group') {
        return other_column.column_groups?.some(
          (cg) => cg.column_group_id === identifier.id
        )
      } else if (identifier.type === 'param') {
        const [key, value] = Object.entries(identifier.value)[0]
        return (
          JSON.stringify(
            table_state_columns[table_columns.indexOf(other_column)].params?.[
              key
            ]
          ) === JSON.stringify(value)
        )
      }
      return false
    }

    // Sort identifiers by consecutive neighbor count (descending)
    identifiers.sort(
      (a, b) => count_consecutive_neighbors(b) - count_consecutive_neighbors(a)
    )

    return identifiers
  }

  for (let i = 0; i < table_columns.length; i++) {
    const column = table_columns[i]
    const column_state = table_state_columns[i]

    let { deepest_group: current_group, parent_groups } =
      find_deepest_matching_group({
        group: root_group,
        column,
        column_state
      })

    const identifiers = get_group_identifiers({
      column,
      column_state,
      parent_groups,
      table_columns,
      current_index: i
    })

    for (const identifier of identifiers) {
      let matching_group = current_group
      const param_key = Object.keys(identifier.value)[0]

      const is_matching_column_group = is_matching_column_group_identifier(
        matching_group,
        identifier
      )
      const is_matching_params = is_matching_params_identifier(
        matching_group,
        param_key,
        identifier
      )

      if (!is_matching_column_group && !is_matching_params) {
        matching_group = find_matching_group(
          current_group,
          identifier,
          param_key
        )

        if (!matching_group) {
          matching_group = create_and_add_new_group(current_group, identifier)
        }
      }

      current_group = matching_group
    }
    current_group.columns.push({
      ...column,
      id: `${column.column_id}-${i}`
    })
  }

  function is_matching_column_group_identifier(group, identifier) {
    return (
      group.column_group && group.column_group.column_group_id === identifier.id
    )
  }

  function is_matching_params_identifier(group, param_key, identifier) {
    return (
      group.params &&
      JSON.stringify(group.params[param_key]) ===
        JSON.stringify(identifier.value[param_key])
    )
  }

  function find_matching_group(current_group, identifier, param_key) {
    return current_group.columns
      .filter((group) => !group.locked)
      .find(
        (group) =>
          is_matching_column_group_identifier(group, identifier) ||
          is_matching_params_identifier(group, param_key, identifier)
      )
  }

  function create_and_add_new_group(current_group, identifier) {
    const new_group = create_group({ identifier })
    current_group.columns.forEach((child) => {
      child.locked = true
    })
    current_group.columns.push(new_group)
    return new_group
  }

  return root_group.columns
}

function handle_array_param_value(param_value, param_key, column, param_label) {
  const is_range =
    column.column_params[param_key]?.data_type === TABLE_DATA_TYPES.RANGE

  if (is_range) {
    return handle_range_param_value(param_value, param_key, column, param_label)
  } else {
    const column_param_labels = param_value.map((param_v) => {
      if (typeof param_v === 'object' && param_v.dynamic_type) {
        return `${param_v.dynamic_type} (${param_v.value})`
      } else {
        return (
          column.column_params?.[param_key]?.values?.find(
            (def_v) => def_v?.value === param_v
          )?.label || param_v
        )
      }
    })
    return `${param_label}: ${column_param_labels.join(', ')}`
  }
}

function handle_range_param_value(param_value, param_key, column, param_label) {
  const low_value = Math.min(param_value[0], param_value[1])
  const high_value = Math.max(param_value[0], param_value[1])

  const column_def = column.column_params[param_key]
  if (high_value === column_def.max) {
    return `${param_label}: ${low_value}+`
  } else if (low_value === column_def.min) {
    return `${param_label}: <${high_value}`
  } else {
    return `${param_label}: ${low_value}-${high_value}`
  }
}

function handle_dynamic_param_value(param_value, param_label) {
  return `${param_label}: ${param_value.dynamic_type} (${param_value.value})`
}

function handle_single_param_value(
  param_value,
  param_key,
  column,
  param_label
) {
  const is_boolean =
    column.column_params[param_key]?.data_type === TABLE_DATA_TYPES.BOOLEAN

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
