// A sort clause names a column OCCURRENCE -- `column_id` plus `column_index`,
// the ordinal among the columns sharing that id -- so its target is positional.
// Any edit to the columns array can move that target, remove it, or leave a
// DIFFERENT column under the ordinal it names, and the server resolves a clause
// by the same pair: an ordinal that no longer matches resolves to nothing and
// the sort is dropped from the query in silence.
//
// Every edit therefore carries its sort with it, described as
// `next_to_previous_index`: for each position in `next_columns`, the position
// that entry held in `previous_columns`, or `null` when the entry is new.
//
//   removed a set of positions  ->  previous_columns.map((_, i) => i)
//                                     .filter((i) => !removed.includes(i))
//   reordered                   ->  arrayMove(previous_columns.map((_, i) => i), from, to)
//   inserted a copy at `at`     ->  the same list with `null` spliced in at `at`
//
// Only a clause this edit actually moved is rewritten. A clause that did not
// resolve BEFORE the edit is left exactly as it was: something else orphaned it,
// and silently deleting a stale clause here would turn an unrelated column
// removal into data loss for a sort the user may still be able to restore.

// A columns entry is either a bare column_id string or a { column_id, params }
// object, so every reader of the array has to accept both.
export const get_column_id = (column) =>
  typeof column === 'string' ? column : column?.column_id

const find_occurrence_position = ({ column_id, column_index, columns }) => {
  let occurrence = 0
  for (const [position, column] of columns.entries()) {
    if (get_column_id(column) !== column_id) continue
    if (occurrence === column_index) return position
    occurrence += 1
  }
  return -1
}

const count_occurrences_before = ({ column_id, position, columns }) =>
  columns
    .slice(0, position)
    .filter((column) => get_column_id(column) === column_id).length

export default function remap_sort_for_column_change({
  sort = [],
  previous_columns = [],
  next_columns = [],
  next_to_previous_index = []
}) {
  const next_position_by_previous_position = new Map()
  next_to_previous_index.forEach((previous_position, next_position) => {
    if (previous_position === null || previous_position === undefined) return
    if (next_position_by_previous_position.has(previous_position)) return
    next_position_by_previous_position.set(previous_position, next_position)
  })

  const remapped_sort = []

  for (const sort_clause of sort) {
    const column_index = sort_clause.column_index || 0
    const previous_position = find_occurrence_position({
      column_id: sort_clause.column_id,
      column_index,
      columns: previous_columns
    })

    // Already orphaned before this edit -- not ours to remove.
    if (previous_position === -1) {
      remapped_sort.push(sort_clause)
      continue
    }

    const next_position =
      next_position_by_previous_position.get(previous_position)

    // The column the user sorted by is gone, or its slot now holds a different
    // column. Either way the clause has no subject left.
    if (next_position === undefined) continue
    if (get_column_id(next_columns[next_position]) !== sort_clause.column_id) {
      continue
    }

    remapped_sort.push({
      ...sort_clause,
      column_index: count_occurrences_before({
        column_id: sort_clause.column_id,
        position: next_position,
        columns: next_columns
      })
    })
  }

  return remapped_sort
}

// The common case: an edit that only removes positions, leaving the survivors
// in order. Call sites that reorder or insert build the mapping themselves.
export const remap_sort_for_removed_column_positions = ({
  sort = [],
  previous_columns = [],
  removed_positions = []
}) => {
  const kept_positions = previous_columns
    .map((_, position) => position)
    .filter((position) => !removed_positions.includes(position))

  return remap_sort_for_column_change({
    sort,
    previous_columns,
    next_columns: kept_positions.map((position) => previous_columns[position]),
    next_to_previous_index: kept_positions
  })
}
