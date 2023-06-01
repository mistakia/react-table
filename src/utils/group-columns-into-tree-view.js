// group items can be a column field or a group with the following schema
// {
//   header: string,
//   column_group: object,
//   columns: array (columns fields or group items)
// }

// groups table columns by their groups recursively

export default function group_columns_into_tree_view(table_columns = []) {
  // clone the table columns to avoid mutating the original array
  table_columns = table_columns.map((column) => ({ ...column }))
  const column_groups_index = {}
  const individual_columns = []

  for (const column of table_columns) {
    if (!column.column_groups || column.column_groups.length === 0) {
      individual_columns.push(column)
      continue
    }

    for (const column_group of column.column_groups || []) {
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
    const grouped_columns = group_columns_into_tree_view(columns)

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
