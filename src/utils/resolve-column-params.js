// One resolution for "what params should this column carry", shared by every
// site that writes them: initial defaults when a column is added, and the
// re-resolution that runs after a user edits one param.
//
// The problem it exists for: a param's admissible values can DEPEND on a
// sibling param. `selection_type` on a betting-market column admits OVER/UNDER
// for an over/under market and YES/NO for a yes/no market, so a value that was
// correct when the column was added becomes unsatisfiable the moment
// `market_type` changes. Nothing re-derived it, so the column kept the stale
// value, matched no rows, and rendered empty — see
// `player_game_prop_line_from_betting_markets` with `market_type
// ANYTIME_TOUCHDOWN` and `selection_type OVER`, which is a combination the
// database can never answer.
//
// A param declares the dependency by supplying `get_values(params)` (the
// admissible set for the current sibling values) and/or
// `get_default_value(params)` (the default for them). Both receive the params
// resolved SO FAR, and both are optional — a param declaring neither behaves
// exactly as it did before this module existed.

const MAX_RESOLUTION_PASSES = 4

// SELECT params are stored as a LIST even when `single`, so a comparison
// against the declared values has to unwrap. Non-SELECT params are compared
// as scalars.
const to_list = (value) => {
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// The admissible values for one param given its siblings. `get_values` wins
// over the static `values` when declared; a param with neither constrains
// nothing and every value is admissible.
export const resolve_param_values = ({ param_definition, params }) => {
  if (typeof param_definition.get_values === 'function') {
    return param_definition.get_values(params)
  }
  return param_definition.values
}

// The default for one param given its siblings, dynamic form preferred.
export const resolve_param_default = ({ param_definition, params }) => {
  if (typeof param_definition.get_default_value === 'function') {
    const dynamic_default = param_definition.get_default_value(params)
    if (dynamic_default !== undefined && dynamic_default !== null) {
      return dynamic_default
    }
  }
  return param_definition.default_value
}

// Is the held value the SHAPE the definition can store?
//
// Only `is_single` is judged here, and the omission of the other arity field is
// deliberate. A param has two, they are not interchangeable, and only one of
// them describes a permanent defect:
//
//   `is_single` is RANGE-only and shape-bearing — a scalar rather than a
//   [min, max] pair. It is a static property of the declaration, so an array
//   stored against it is wrong now and can never become right. The user cannot
//   fix it either: `initialize_value` in `column-param-range-filter.js` returns
//   a stored array unchanged (an array is non-null), so a scalar slider is
//   handed a pair and that shape reaches the server.
//
//   `single` is SELECT-only and LENGTH-only — SELECT stores a list either way.
//   It is NOT judged here, because its verdict is reversible: a param naming an
//   active row axis in `enable_multi_on_split` admits a list on that split, and
//   the row-axes control writes `row_axes` without re-resolving params
//   (`table-row-axes-controls.js:188`). Judging it would mean that turning a
//   split off and then editing any sibling param DESTROYS the stored list —
//   replaced by the default, with no way back when the split returns. The
//   symptom it would fix is that a single-select shows element zero, which is
//   cosmetic, non-destructive, and re-pickable. Repairing costs more than the
//   bug. (Census, 2026-09-02: this rule would have reset 9 legitimate stored
//   values across 5 league saved views and repaired nothing.)
const is_param_value_shape_admissible = ({ param_definition, value }) =>
  !param_definition.is_single || !Array.isArray(value)

// Is the currently-held value still satisfiable under the current siblings?
// A param with no declared value set cannot be judged on MEMBERSHIP, so it is
// left alone there — but shape is judged from the definition alone, which is
// what lets a RANGE param (which declares no `values` at all) be judged.
export const is_param_value_admissible = ({
  param_definition,
  params,
  value
}) => {
  const held = to_list(value)
  // An unset param is not "inadmissible" — it is unset, and the caller decides
  // whether to fill it. Only a value the user can see is judged here.
  if (held.length === 0) return true

  // Shape before membership: a RANGE param declares no `values` at all, so the
  // membership test below returns true for every one of them and would never
  // reach a pair stored where a scalar belongs.
  if (!is_param_value_shape_admissible({ param_definition, value })) {
    return false
  }

  const admissible = resolve_param_values({ param_definition, params })
  if (!Array.isArray(admissible) || admissible.length === 0) return true

  return held.every((entry) => admissible.includes(entry))
}

const store_value = ({ param_definition, value, data_type_select }) =>
  param_definition.data_type === data_type_select ? [value] : value

/**
 * Resolve a column's params to a mutually-consistent set.
 *
 * Runs to a fixed point (bounded by MAX_RESOLUTION_PASSES) because resetting
 * one param can change what another admits. Params the caller already holds are
 * PRESERVED wherever they remain admissible, so this never overwrites a
 * deliberate user choice — it only replaces a value the current sibling values
 * make unreachable, and fills one that was never set.
 *
 * @param {object} args
 * @param {object} args.column_params - the column definition's param declarations
 * @param {object} [args.params] - params currently held (empty when adding a column)
 * @param {number} args.data_type_select - TABLE_DATA_TYPES.SELECT, injected to
 *   keep this module free of a constants import cycle
 * @param {boolean} [args.fill_unset] - fill params that carry no value with
 *   their default. True when ADDING a column, where the whole point is to
 *   populate defaults. False when EDITING one, because an absent param is a
 *   deliberate state there — a where-clause entry carries only the params the
 *   user set, and filling the rest would silently narrow the filter.
 * @returns {{params: object, reset_param_names: string[]}} the resolved params
 *   and the names this call had to replace, for a caller that wants to tell the
 *   user rather than change things silently
 */
export const resolve_column_params = ({
  column_params,
  params = {},
  data_type_select,
  fill_unset = true
}) => {
  if (!column_params) return { params: { ...params }, reset_param_names: [] }

  const resolved = { ...params }
  const reset_param_names = new Set()

  for (let pass = 0; pass < MAX_RESOLUTION_PASSES; pass++) {
    let changed = false

    for (const [param_key, param_definition] of Object.entries(column_params)) {
      const current = resolved[param_key]
      const is_unset = to_list(current).length === 0

      // An unset param takes its default (only where the caller asked for
      // filling); a set one is always repaired when the current siblings make
      // it unreachable, because that value can no longer match anything.
      const needs_value = is_unset
        ? fill_unset
        : !is_param_value_admissible({
            param_definition,
            params: resolved,
            value: current
          })

      if (!needs_value) continue

      const next_default = resolve_param_default({
        param_definition,
        params: resolved
      })
      if (next_default === undefined || next_default === null) continue

      const next_value = store_value({
        param_definition,
        value: next_default,
        data_type_select
      })
      if (JSON.stringify(next_value) === JSON.stringify(current)) continue

      // Replacing a value the user set is the reportable event; filling an
      // absent one is just the default doing its job.
      if (!is_unset) reset_param_names.add(param_key)
      resolved[param_key] = next_value
      changed = true
    }

    if (!changed) break
  }

  return { params: resolved, reset_param_names: [...reset_param_names] }
}

export default resolve_column_params
