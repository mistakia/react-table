// Which occurrence of its column_id a leaf column is, among the leaf columns
// sharing that id, ordered by their table_state index. A view may hold the
// same column twice with different params; the row value for each lives at
// `${accessorKey}_${occurrence}`, so this is the key half the cell and the
// average row must agree on.
export function get_column_occurrence_index({ table, column }) {
  return table
    .getAllLeafColumns()
    .filter((col) => col.columnDef.column_id === column.columnDef.column_id)
    .sort((a, b) => a.columnDef.index - b.columnDef.index)
    .findIndex((col) => col.columnDef.index === column.columnDef.index)
}
