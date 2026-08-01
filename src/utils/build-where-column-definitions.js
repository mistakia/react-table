// Resolve each `where` entry to its column definition, POSITIONALLY ALIGNED
// with the input: index i always describes where[i], and is null when the
// filter names a column absent from all_columns (a stale saved view, or
// all_columns not yet loaded).
//
// The alignment is the whole point. Filter controls key several things off the
// index into `where` -- the rendered FilterItem's `where_index`,
// `selected_where_indexes`, and the bulk-remove filter -- so a compacted result
// silently shifts every definition after an unresolved filter onto the wrong
// row, and overruns the end of the array once enough are dropped.
export default function build_where_column_definitions(where, all_columns) {
  const definitions = []
  for (const where_item of where || []) {
    const column_id =
      where_item.column_id || where_item.id || where_item.column_name
    // TODO use key/value store
    const column_data = column_id
      ? (all_columns || []).find((c) => c.column_id === column_id)
      : null
    definitions.push(
      column_data
        ? { ...column_data, selected_params: where_item.params || {} }
        : null
    )
  }
  return definitions
}
