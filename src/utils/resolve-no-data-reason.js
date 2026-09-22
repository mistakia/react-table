// WHY a column has nothing useful in it, when the consumer can attribute it.
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
//
// THE TWO INPUTS ARE INDEPENDENT FACTS, AND CHAINING THEM WAS THE DEFECT.
// "Every loaded row is empty" is a fact about the ROWS. "This season is not
// published for this source" is a fact about the SOURCE'S SCHEDULE, derived
// from a static publication cadence rather than estimated from data — it is
// true whether or not a row slipped through. Gating the second on the first
// made a publication fact vetoable by stray rows, and in production that is
// what always happens: every declaring column measured carried a handful of
// non-null rows in the unpublished season (12 of 500 for the
// `*_from_seasonlogs` family, 41 of 500 for `player_espn_catch_score`), so the
// season wording never rendered once. The emptiness gate now governs only the
// GENERIC branch, which is the one actually derived from rows.

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
  // The attributed cause is answered FIRST and without consulting the rows,
  // because it is not a claim about emptiness that the rows could refute. A
  // partially populated unpublished season is still an unpublished season, and
  // the reader is better served by "earlier seasons will have values" than by
  // silence over a column holding a dozen stray numbers out of five hundred.
  if (season_unavailable_column_ids?.has(accessor_path))
    return NO_DATA_SEASON_UNAVAILABLE

  // The generic wording is the one derived from the loaded rows, so it is the
  // one the rows gate. With no cause named, a populated column says nothing.
  if (!has_no_data) return null

  return NO_DATA_GENERIC
}

export default resolve_no_data_reason
