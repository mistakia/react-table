// One parameter control, derived from EVERY selected record rather than from
// whichever record was ticked first.
//
// The problem it exists for: the bulk parameter editor built its per-parameter
// definition with `if (!defs[name]) defs[name] = def`, so the offered values,
// the default, and the arity were decided by CLICK ORDER. Two columns can
// declare the same parameter key with different rules —
// `player_game_prop_line_from_betting_markets` admits 97 market types and
// `team_game_prop_line_from_betting_markets` admits 25, sharing none — and
// first-wins would offer one column's rules and write the result to the other,
// producing a column that matches no rows.
//
// Fields split three ways. Fields that change the STRUCTURE of the stored value
// cannot be reconciled at all, so a disagreement REFUSES the parameter. Fields
// that narrow it are MERGED to the intersection, which is valid for every
// record by construction. Everything else is presentation and takes the first
// record's value.
//
// Refusing is deliberate: silently picking one column's rules is the defect.

import { resolve_param_values } from './resolve-column-params.js'

// Why each of these refuses rather than merging:
//
// - `data_type`   each filter component writes a different type entirely, and
//                 `store_value` array-wraps only for SELECT.
// - `component`   a custom component is returned before `data_type` is read, so
//                 the written shape is unknowable from the declaration.
// - `column_specs` the spec list IS the key set of every stored object.
//
// These three are one user-facing case — the columns edit the parameter with
// different kinds of control — and are reported as `incompatible_control`.
const CONTROL_SHAPE_FIELDS = ['data_type', 'component', 'column_specs']

// `is_single` is RANGE-only and decides scalar versus two-element pair, so it
// is the one structural field with its own user-facing explanation. It is NOT
// interchangeable with `single`, which is SELECT-only and never changes the
// stored shape (a SELECT param stores a list either way) — `single` merges.
const ARITY_FIELD = 'is_single'

export const CONFLICT_REASONS = {
  ARITY: 'arity_conflict',
  INCOMPATIBLE_CONTROL: 'incompatible_control',
  NO_ADMISSIBLE_VALUES: 'no_admissible_values'
}

// A declared value is either a primitive or a `{ value, label }` object —
// `league-format-logs-table-fields.js` declares the object form. Set membership
// keys on the underlying value in both cases.
const to_value_key = (entry) => entry?.value ?? entry

const signature_of = (value) => {
  if (typeof value === 'function') return `function:${value.name}`
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

const defined = (values) => values.filter((value) => value !== undefined)

const column_id_of = ({ record }) => record?.column_id

// Group entries by what they declare for `field`, preserving declaration order
// so the refusal message lists columns the way the checkbox list does.
const group_entries_by_field = ({ entries, field }) => {
  const groups = new Map()
  for (const entry of entries) {
    const key = signature_of(entry.param_definition[field])
    if (!groups.has(key)) {
      groups.set(key, { value: entry.param_definition[field], column_ids: [] })
    }
    groups.get(key).column_ids.push(column_id_of(entry))
  }
  return [...groups.values()]
}

// The admissible set for ONE record, resolved against that record's own current
// sibling params. Using `resolve_param_values` rather than the raw `values` is
// load-bearing: `selection_type` declares `get_values` and no static `values`,
// so a raw intersection would be empty for it.
const admissible_values_for = ({ record, param_definition }) => {
  const params =
    typeof record?.get_params === 'function' ? record.get_params() : {}
  return resolve_param_values({ param_definition, params })
}

// Intersect the declared values across records, keeping the full entry (so the
// `{ value, label }` form survives) from the first record that declared it.
// A record whose definition declares no value set constrains nothing and is
// skipped rather than collapsing the intersection to empty.
const merge_values = (entries) => {
  let merged = null

  for (const entry of entries) {
    const values = admissible_values_for(entry)
    if (!Array.isArray(values)) continue

    if (merged === null) {
      merged = [...values]
      continue
    }

    const keys = new Set(values.map(to_value_key))
    merged = merged.filter((value) => keys.has(to_value_key(value)))
  }

  return merged
}

// Dynamic values intersect by `dynamic_type`, not by identity: `nfl_week_id`
// carries `current_year_reg_weeks` and `single_nfl_week_id` does not, and
// offering a dynamic value a record cannot resolve is the same defect in a
// different field.
const merge_dynamic_values = (entries) => {
  let merged = null

  for (const { param_definition } of entries) {
    const values = param_definition.dynamic_values
    if (!Array.isArray(values)) continue

    if (merged === null) {
      merged = [...values]
      continue
    }

    const types = new Set(values.map((value) => value.dynamic_type))
    merged = merged.filter((value) => types.has(value.dynamic_type))
  }

  return merged
}

// Tightest overlap, and never undefined where any record supplied a bound —
// `calculate_width` in the range filter calls `.toString()` on both unguarded.
// A crossed range (every record's min above another's max) would need disjoint
// bounds; no league parameter key diverges on min or max at all, so it is left
// to render as an empty range rather than given a refusal reason of its own.
const merge_bounds = (entries) => {
  const mins = defined(
    entries.map(({ param_definition }) => param_definition.min)
  )
  const maxes = defined(
    entries.map(({ param_definition }) => param_definition.max)
  )
  const steps = defined(
    entries.map(({ param_definition }) => param_definition.step)
  )

  return {
    min: mins.length ? Math.max(...mins) : undefined,
    max: maxes.length ? Math.min(...maxes) : undefined,
    // Finest granularity is representable on every record.
    step: steps.length ? Math.min(...steps) : undefined
  }
}

// `enable_multi_on_split` INTERSECTS rather than unions. `is_single_select`
// returns false when a row axis matches, so a LARGER set is more permissive; a
// union would offer a multi-value picker to a column that admits one value,
// which is the over-long-value bug this task exists to stop.
const merge_enable_multi_on_split = (entries) => {
  let merged = null

  for (const { param_definition } of entries) {
    const axes = param_definition.enable_multi_on_split
    if (!Array.isArray(axes)) continue

    if (merged === null) {
      merged = [...axes]
      continue
    }

    const axis_set = new Set(axes)
    merged = merged.filter((axis) => axis_set.has(axis))
  }

  return merged
}

// `enable_on_row_axes` UNIONS. It governs visibility only, so keeping the
// control offered wherever any record can use it costs nothing; a record that
// cannot use it is unaffected either way.
const merge_enable_on_row_axes = (entries) => {
  const merged = []
  for (const { param_definition } of entries) {
    for (const axis of param_definition.enable_on_row_axes || []) {
      if (!merged.includes(axis)) merged.push(axis)
    }
  }
  return merged.length ? merged : undefined
}

/**
 * Resolve one parameter's definition across every record that declares it.
 *
 * @param {object} args
 * @param {Array<{record: object, param_definition: object}>} args.entries - one
 *   per record whose column declares this parameter, in selection order
 * @returns {{param_definition: object|null, conflict: object|null}} the merged
 *   definition, or `param_definition: null` with a `conflict` of
 *   `{ reason, groups }` where each group is `{ label, value, column_ids }`
 *   describing one side of the disagreement
 */
export const resolve_param_definition_across_records = ({
  entries = []
} = {}) => {
  if (!entries.length) return { param_definition: null, conflict: null }

  // A single record takes the same path as the rest rather than short-circuiting
  // on its own definition. It has to: the single-record case is where
  // `resolve_param_values` earns its keep, resolving a `get_values` param
  // against that record's current siblings. Returning the raw declaration here
  // would undo that and reintroduce the unreachable-value bug for one column.
  // The structural checks below are no-ops on one entry, so a lone record can
  // never refuse.

  for (const field of CONTROL_SHAPE_FIELDS) {
    const groups = group_entries_by_field({ entries, field })
    if (groups.length > 1) {
      return {
        param_definition: null,
        conflict: {
          reason: CONFLICT_REASONS.INCOMPATIBLE_CONTROL,
          field,
          groups: groups.map((group) => ({
            label: 'edit this parameter differently',
            value: group.value,
            column_ids: group.column_ids
          }))
        }
      }
    }
  }

  const arity_groups = group_entries_by_field({ entries, field: ARITY_FIELD })
  if (arity_groups.length > 1) {
    return {
      param_definition: null,
      conflict: {
        reason: CONFLICT_REASONS.ARITY,
        field: ARITY_FIELD,
        groups: arity_groups.map((group) => ({
          label: group.value ? 'take a single value' : 'take a range',
          value: group.value,
          column_ids: group.column_ids
        }))
      }
    }
  }

  const base_definition = entries[0].param_definition
  const values = merge_values(entries)

  if (Array.isArray(values) && values.length === 0) {
    return {
      param_definition: null,
      conflict: {
        reason: CONFLICT_REASONS.NO_ADMISSIBLE_VALUES,
        field: 'values',
        // Each record is its own group here: the message names what each column
        // accepts, so collapsing equal sets would hide which column is which.
        groups: entries.map((entry) => ({
          label: 'accept',
          value: admissible_values_for(entry) || [],
          column_ids: [column_id_of(entry)]
        }))
      }
    }
  }

  const dynamic_values = merge_dynamic_values(entries)
  const { min, max, step } = merge_bounds(entries)
  const enable_multi_on_split = merge_enable_multi_on_split(entries)
  const enable_on_row_axes = merge_enable_on_row_axes(entries)

  // A default outside the merged set would be written to a column that cannot
  // hold it. Dropping it is not cosmetic — the select filter flips
  // `set_null_on_all_click` on its presence, and the range filter falls through
  // to `default_value ?? min` — but an inadmissible default is worse.
  const value_keys = Array.isArray(values)
    ? new Set(values.map(to_value_key))
    : null
  const default_value =
    value_keys && base_definition.default_value !== undefined
      ? value_keys.has(to_value_key(base_definition.default_value))
        ? base_definition.default_value
        : undefined
      : base_definition.default_value

  const param_definition = {
    ...base_definition,
    // Most restrictive wins: SELECT storage is a list either way, so narrowing
    // to one element stays valid on every record.
    single: entries.some(({ param_definition: def }) => Boolean(def.single)),
    // Conservative: if any record hides the parameter, it stays hidden.
    hidden: entries.some(({ param_definition: def }) => Boolean(def.hidden)),
    default_value
  }

  if (values !== null) param_definition.values = values
  if (dynamic_values !== null) param_definition.dynamic_values = dynamic_values
  if (enable_multi_on_split !== null) {
    param_definition.enable_multi_on_split = enable_multi_on_split
  }
  if (enable_on_row_axes !== undefined) {
    param_definition.enable_on_row_axes = enable_on_row_axes
  } else {
    delete param_definition.enable_on_row_axes
  }
  if (min !== undefined) param_definition.min = min
  if (max !== undefined) param_definition.max = max
  if (step !== undefined) param_definition.step = step

  return { param_definition, conflict: null }
}

export default resolve_param_definition_across_records
