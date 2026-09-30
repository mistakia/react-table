// A chart column is persisted as `{ column_id, column_index }`, the identity
// sort already uses, and everything a chart draws from is derived here from the
// live table rather than copied at selection time. A copy went stale the moment
// the column's params were edited: the chart read the new values through the
// accessor path while labelling them with the old params.
//
// `column_index` is the occurrence among leaf columns sharing the column_id,
// ordered by definition index -- the rule the column header uses when it writes
// the reference, so a reference written by a header resolves back to it.
//
// Returns null for an empty reference and for one naming a column the view no
// longer holds. The reference itself is left in table state: it is reversible
// user state, and restoring the column brings the chart back.

const get_entry_column_id = (entry) =>
  typeof entry === 'string' ? entry : entry?.column_id

export const is_same_chart_column = (reference, { column_id, column_index }) =>
  Boolean(reference?.column_id) &&
  reference.column_id === column_id &&
  (reference.column_index || 0) === column_index

export const toggle_chart_column = (reference, { column_id, column_index }) =>
  is_same_chart_column(reference, { column_id, column_index })
    ? null
    : { column_id, column_index }

export const resolve_chart_column = ({
  reference,
  leaf_column_defs = [],
  table_state_columns = [],
  all_columns = {},
  enable_duplicate_column_ids = false
}) => {
  if (!reference?.column_id) return null
  const { column_id } = reference
  const column_index = reference.column_index || 0

  const column = all_columns[column_id]
  if (!column) return null

  const leaf_column_def = leaf_column_defs
    .filter((column_def) => column_def.column_id === column_id)
    .sort((a, b) => a.index - b.index)[column_index]
  if (!leaf_column_def) return null

  // The key the cells read, not the leaf's tanstack id (`<column_id>-<n>`),
  // which names no field on a row: the header derived the path from the id,
  // and a consumer without duplicate column ids got a chart with no points.
  const accessor_path = enable_duplicate_column_ids
    ? `${leaf_column_def.accessorKey}_${column_index}`
    : leaf_column_def.accessorKey

  let occurrence = 0
  const table_state_entry = table_state_columns.find((entry) => {
    if (get_entry_column_id(entry) !== column_id) return false
    return occurrence++ === column_index
  })
  const column_params =
    table_state_entry && typeof table_state_entry === 'object'
      ? table_state_entry.params || null
      : null

  return { column, accessor_path, column_params }
}

export default resolve_chart_column
