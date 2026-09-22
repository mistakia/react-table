// WHY a column came back empty, when the consumer can attribute it.
//
// The split of responsibility is the point and it is not symmetric. WHICH
// columns are empty is decided here in the table, from the loaded rows, because
// nothing upstream can see them — `find_columns_with_no_data` owns that. WHY is
// the opposite: the table cannot know a source's publication schedule, so a
// consumer that does may hand one cause down, keyed by accessor path.
//
// Everything else stays generic. A cause the consumer did not name is not a
// cause this module guesses at, and the fallback wording deliberately suggests
// the column parameters rather than asserting anything about the source.

export const NO_DATA_GENERIC =
  'No data — every loaded row is empty for this column. Check the column parameters: the source may have nothing for this combination.'

export const NO_DATA_SEASON_UNAVAILABLE =
  'No data — this season has not been published for this column’s source yet. Earlier seasons will have values.'

/**
 * @param {object} args
 * @param {boolean} args.has_no_data - whether every loaded row was empty
 * @param {string} args.accessor_path - the column instance's row key
 * @param {Set<string>} [args.season_unavailable_column_ids] - accessor paths the
 *   consumer attributes to an unpublished season
 * @returns {string|null} the tooltip text, or null when there is no warning
 */
export const resolve_no_data_reason = ({
  has_no_data,
  accessor_path,
  season_unavailable_column_ids
}) => {
  // A column holding values gets no warning at all, whatever the consumer
  // claims about it. An upstream list that disagrees with the loaded rows loses
  // to the rows -- the consumer's list describes what it EXPECTS to be empty,
  // and being wrong about that must not put a warning on a populated column.
  if (!has_no_data) return null

  if (season_unavailable_column_ids?.has(accessor_path))
    return NO_DATA_SEASON_UNAVAILABLE

  return NO_DATA_GENERIC
}

export default resolve_no_data_reason
