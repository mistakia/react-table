// Resolve the selected columns of a table state into renderable column
// definitions.
//
// A column definition is keyed by column_id alone, but a table can hold several
// instances of the same column with different params, and some fields have to
// differ between them. Those fields may be declared as a function of the
// instance's params, and this is where that function is called. A plain value
// still works unchanged.
//
// Per-instance fields:
//   - reverse_percentiles: which end of the range counts as good
//   - fixed: decimal places, since the same measure rendered as a count wants an
//     integer where the rate wants two places, and both can sit in one table
//   - row_axes: which splits the column can be broken out along, since whether
//     an axis is answerable can depend on the params -- a betting column can
//     only offer the line axis when its market posts a ladder of lines, and an
//     axis the server would refuse must not reach the picker
//   - row_axis_domain: for an axis whose rows are keyed on a VALUE, what that
//     column's values are OF, so two columns offering the same axis can be
//     found to mean different things by it. See resolve-row-axis-conflicts.js
export default function resolve_table_state_columns({
  table_state = {},
  all_columns = {}
}) {
  let starting_index = (table_state.prefix_columns || []).length
  const columns = []
  for (const column of table_state.columns || []) {
    const column_id =
      typeof column === 'string'
        ? column
        : column.column_id || column.id || column.column_name
    const column_def = column_id && all_columns[column_id]
    if (!column_def) {
      continue
    }
    const column_params = typeof column === 'string' ? {} : column.params || {}
    columns.push({
      ...column_def,
      index: starting_index,
      reverse_percentiles: resolve_field(
        column_def.reverse_percentiles,
        column_params
      ),
      fixed: resolve_field(column_def.fixed, column_params),
      row_axes: resolve_field(column_def.row_axes, column_params),
      row_axis_domain: resolve_field(column_def.row_axis_domain, column_params)
    })
    starting_index += 1
  }
  return columns
}

const resolve_field = (field, column_params) =>
  typeof field === 'function' ? field(column_params) : field
