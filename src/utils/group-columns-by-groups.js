// Group items can be a column field or a group with the following schema:
// {
//   header: string, // used as a label
//   column_group: object, // column group definition or column parameters
//   columns: array of objects // just like this one or a column definition
// }

import { format_column_params } from '#src/utils/format-column-params.js'

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
      id: identifier.id,
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
    deepest_group,
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
          // The id is a key; a reader sees the group's label when it has one.
          label: column_group.label || column_group.column_group_id,
          value: column_group
        })
      }
    }

    if (column_state.params) {
      for (const [param_key, param_value] of Object.entries(
        column_state.params
      )) {
        const label = format_column_params({
          column_def: column,
          column_state_params: { [param_key]: param_value },
          variant: 'short'
        })
        if (!label) continue

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
      } else if (identifier.type === 'column_groups') {
        return identifier.ids.every((id) =>
          other_column.column_groups?.some((cg) => cg.column_group_id === id)
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

    // A column's groups are facets, not a path: touchdowns from plays is both
    // RUSHING and RECEIVING. The column bands under one of them, and opens a
    // band for another only where a neighbor already banded with it shares that
    // group too, so TEAM STATS over PASSING still nests while a lone RECEIVING
    // band never stacks over a single RUSHING column.
    const banded_group_ids = [...parent_groups, deepest_group]
      .map((group) => group.column_group?.column_group_id)
      .filter((id) =>
        column.column_groups?.some((cg) => cg.column_group_id === id)
      )

    return identifiers.filter((identifier) => {
      if (identifier.type !== 'column_group') return true
      if (banded_group_ids.length) {
        const shared_band = {
          type: 'column_groups',
          ids: [...banded_group_ids, identifier.id]
        }
        if (!count_consecutive_neighbors(shared_band)) return false
      }
      banded_group_ids.push(identifier.id)
      return true
    })
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
      deepest_group: current_group,
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
