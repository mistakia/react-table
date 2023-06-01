// group items can be a column field or a group with the following schema
// {
//   header: string,
//   column_group: object,
//   columns: array (columns fields or group items)
// }

export default function (table_columns = []) {
  const root_group = { column_group: null, columns: [] }
  const groups_map = new Map()

  for (const column of table_columns) {
    let current_group = root_group
    for (const column_group of column.column_groups || []) {
      if (!groups_map.has(column_group.column_group_id)) {
        const new_group = {
          header: column_group.column_group_id,
          column_group,
          columns: []
        }
        groups_map.set(column_group.column_group_id, new_group)
        current_group.columns.push(new_group)
      }
      current_group = groups_map.get(column_group.column_group_id)
    }

    current_group.columns.push(column)
  }

  return root_group.columns
}
