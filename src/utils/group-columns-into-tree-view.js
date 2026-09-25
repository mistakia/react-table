// group items can be a column field or a group with the following schema
// {
//   header: string,
//   column_group: object,
//   columns: array (columns fields or group items)
// }

// groups table columns by their groups recursively

// A column is indexed under EVERY group it names, so naming two groups
// cross-lists the column: it nests under the first and ALSO appears as a
// top-level node under the second. That is what a consumer wants when both
// groups are browsable categories in their own right, and wrong when the
// second exists only to subdivide the first -- there the top-level copy is
// redundant with the nested one and its id has to be padded to read sensibly
// standing alone. A group declaring `nest_only` is skipped while building the
// ROOT level and honoured at every level below it, so it can subdivide a
// parent without becoming a sibling of one. A column whose only groups are
// nest_only still renders, as an ungrouped root-level column.
export default function group_columns_into_tree_view(
  table_columns = [],
  depth = 0
) {
  // clone the table columns to avoid mutating the original array
  table_columns = table_columns.map((column) => ({ ...column }))
  const column_groups_index = {}
  const individual_columns = []

  for (const column of table_columns) {
    // Filtered for INDEXING only -- `column.column_groups` keeps the nest_only
    // entries, which is what lets the recursion pick them up one level down.
    const eligible_column_groups = (column.column_groups || []).filter(
      (column_group) => !(depth === 0 && column_group.nest_only)
    )

    if (eligible_column_groups.length === 0) {
      individual_columns.push(column)
      continue
    }

    for (const column_group of eligible_column_groups) {
      if (!column_group.column_group_id) {
        throw new Error('column_group_id is required')
      }

      if (!column_groups_index[column_group.column_group_id]) {
        column_groups_index[column_group.column_group_id] = {
          column_group,
          columns: []
        }
      }
      column_groups_index[column_group.column_group_id].columns.push(column)
    }
  }

  const result = []
  for (const column_group_id in column_groups_index) {
    const group = column_groups_index[column_group_id]
    const { column_group, columns } = group

    // Recursively group columns in the group
    // remove the parent group from the column groups
    for (const column of columns) {
      column.column_groups = (column.column_groups || []).filter(
        (column_group) => column_group.column_group_id !== column_group_id
      )
    }
    const grouped_columns = group_columns_into_tree_view(columns, depth + 1)

    result.push({
      header: column_group.column_group_id,
      column_group,
      columns: grouped_columns.length > 0 ? grouped_columns : columns,
      column_count: columns.length
    })
  }

  const sorted_result = result.sort((a, b) => {
    // sort by column priority first
    const column_priority = a.column_group.priority - b.column_group.priority
    if (column_priority) {
      return column_priority
    }

    // sort by column count second
    const column_count = b.column_count - a.column_count
    return column_count
  })

  return [...sorted_result, ...individual_columns]
}
