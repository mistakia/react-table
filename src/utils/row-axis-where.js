// A row axis is filtered by an ordinary `where` row whose `column_id` is the
// axis id, e.g. `{ column_id: 'year', operator: 'IN', value: [2024, 2025] }`.
// The axis is not a column, so nothing else in the table owns such a row: once
// its axis leaves `row_axes` the row has no header to show or clear it from,
// and the server ignores it. Dropping it keeps `where` describing the table.
//
// Only axes the consumer offers a filter for (`row_axis_ids`) are dropped. Any
// other row naming an unknown column is a stale saved-view filter, which the
// table reports rather than repairs.
export const drop_inactive_row_axis_where = ({
  where,
  row_axes = [],
  row_axis_ids = []
}) => {
  const inactive_axis_ids = row_axis_ids.filter(
    (row_axis) => !(row_axes || []).includes(row_axis)
  )
  if (!inactive_axis_ids.length) return where
  return where.filter(
    (where_item) => !inactive_axis_ids.includes(where_item?.column_id)
  )
}
