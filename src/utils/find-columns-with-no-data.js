// Which result keys came back EMPTY across every loaded row.
//
// A column that returns null on every row is indistinguishable, at a glance,
// from a column of legitimate zeroes or blanks — which is how a data view
// carrying an unsatisfiable filter reads as real data rather than as an empty
// result. Surfacing it in the header turns "these numbers look wrong" into
// "this column returned nothing".
//
// The rule is deliberately narrow, because a false positive here is worse than
// a miss: a key must be PRESENT in the rows (so a key nothing projects is never
// flagged) and hold null/undefined in every one of them. A row holding 0, an
// empty string or false is a value and disqualifies the key immediately.

/**
 * @param {Array<Record<string, any>>} rows - the loaded result rows
 * @returns {Set<string>} keys present in the rows and null in all of them
 */
export const find_columns_with_no_data = (rows) => {
  const empty_keys = new Set()
  if (!Array.isArray(rows) || rows.length === 0) return empty_keys

  const keys_with_a_value = new Set()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const [key, value] of Object.entries(row)) {
      empty_keys.add(key)
      if (value !== null && value !== undefined) keys_with_a_value.add(key)
    }
  }

  for (const key of keys_with_a_value) empty_keys.delete(key)
  return empty_keys
}

export default find_columns_with_no_data
