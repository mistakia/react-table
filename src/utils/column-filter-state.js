// Project the flat `where` array onto ONE column instance, and reduce edits
// back into it.
//
// The `where` array is a flat AND list with no grouping concept, so a range is
// genuinely two rows (`>=` plus `<=`) rather than a BETWEEN operator -- BETWEEN
// exists in none of the client, schema, security-pattern or server allowlists,
// and `table-state-validator.mjs` forbids array values on comparison operators.
//
// The matching key is `column_id` plus `column_index` ONLY, and deliberately
// NOT `params`. `table.js` `remove_disabled_params` rewrites `item.params` in
// place on every commit whenever `row_axes` is non-empty, so a params-bearing
// key stops matching the row it just wrote: the panel reads blank and the next
// edit appends a duplicate. Rows this module CREATES still carry `params` so
// they target the right column instance; nothing ever matches on them.
//
// Indexes into `where` are load-bearing for four consumers --
// `build_where_column_definitions` (positionally aligned),
// `selected_where_indexes` in the filter controls, and league's data-view
// notices, which key both `filter_index` and their persisted dismissals off the
// position. So `apply_column_filter_state` rewrites in place at a held index,
// appends only for a genuinely new row, and never touches an index the
// descriptor did not claim.
//
// Anything this projection cannot represent -- a second row tying on the same
// key and slot, an operator outside the vocabulary -- is REPORTED in
// `unrepresentable_where_indexes` and never repaired. The panel is a quick
// filter over a strictly more expressive side panel, so silently rewriting a
// filter the user built there would be data loss.

import { TABLE_OPERATORS } from '#src/constants.mjs'

const LOWER_BOUND_OPERATORS = [
  TABLE_OPERATORS.GREATER_THAN,
  TABLE_OPERATORS.GREATER_THAN_OR_EQUAL
]
const UPPER_BOUND_OPERATORS = [
  TABLE_OPERATORS.LESS_THAN,
  TABLE_OPERATORS.LESS_THAN_OR_EQUAL
]
const EXACT_VALUE_OPERATORS = [TABLE_OPERATORS.EQUAL, TABLE_OPERATORS.NOT_EQUAL]
const TEXT_MATCH_OPERATORS = [
  TABLE_OPERATORS.LIKE,
  TABLE_OPERATORS.NOT_LIKE,
  TABLE_OPERATORS.ILIKE,
  TABLE_OPERATORS.NOT_ILIKE
]
const VALUE_SET_OPERATORS = [TABLE_OPERATORS.IN, TABLE_OPERATORS.NOT_IN]
const NULL_CHECK_OPERATORS = [
  TABLE_OPERATORS.IS_NULL,
  TABLE_OPERATORS.IS_NOT_NULL
]

export const COLUMN_FILTER_SLOTS = [
  'lower_bound',
  'upper_bound',
  'exact_value',
  'text_match',
  'value_set',
  'null_check'
]

const SLOT_OPERATORS = {
  lower_bound: LOWER_BOUND_OPERATORS,
  upper_bound: UPPER_BOUND_OPERATORS,
  exact_value: EXACT_VALUE_OPERATORS,
  text_match: TEXT_MATCH_OPERATORS,
  value_set: VALUE_SET_OPERATORS,
  null_check: NULL_CHECK_OPERATORS
}

const slot_for_operator = (operator) =>
  COLUMN_FILTER_SLOTS.find((slot) => SLOT_OPERATORS[slot].includes(operator)) ||
  null

// A where row may name its column as `column_id`, `id` or `column_name`; the
// same three-way fallback `build_where_column_definitions` uses.
const where_item_column_id = (where_item) =>
  where_item.column_id || where_item.id || where_item.column_name

// An absent `column_index` is index 0 -- no UI sets the field today, so every
// pre-existing row belongs to the first instance of its column.
const where_item_column_index = (where_item) => where_item.column_index || 0

const empty_state = () => ({
  lower_bound: null,
  upper_bound: null,
  exact_value: null,
  text_match: null,
  value_set: null,
  null_check: null,
  unrepresentable_where_indexes: []
})

export function resolve_column_filter_state({
  where,
  column_id,
  column_index = 0
}) {
  const state = empty_state()

  for (let where_index = 0; where_index < (where || []).length; where_index++) {
    const where_item = where[where_index]
    if (!where_item) continue
    if (where_item_column_id(where_item) !== column_id) continue
    if (where_item_column_index(where_item) !== column_index) continue

    const slot = slot_for_operator(where_item.operator)
    if (!slot || state[slot]) {
      state.unrepresentable_where_indexes.push(where_index)
      continue
    }

    state[slot] = {
      operator: where_item.operator,
      value: where_item.value,
      where_index
    }
  }

  return state
}

export function apply_column_filter_state({
  where,
  column_id,
  column_index = 0,
  params,
  next_state
}) {
  const current_state = resolve_column_filter_state({
    where,
    column_id,
    column_index
  })
  const next_where = [...(where || [])]
  const removed_where_indexes = []

  for (const slot of COLUMN_FILTER_SLOTS) {
    // A slot absent from next_state is untouched, not cleared -- a body that
    // renders only some slots must not delete the ones it cannot show.
    if (!(slot in next_state)) continue

    const current = current_state[slot]
    const next = next_state[slot]

    if (!next) {
      if (current) removed_where_indexes.push(current.where_index)
      continue
    }

    const next_row = {
      column_id,
      operator: next.operator,
      ...(NULL_CHECK_OPERATORS.includes(next.operator)
        ? {}
        : { value: next.value }),
      ...(column_index ? { column_index } : {}),
      ...(params ? { params } : {})
    }

    if (current) {
      // Preserve whatever else the row carried (`id`, `column_name`, params a
      // caller did not supply) so a row authored in the side panel survives an
      // edit made from the header.
      next_where[current.where_index] = {
        ...next_where[current.where_index],
        ...next_row
      }
    } else {
      next_where.push(next_row)
    }
  }

  if (!removed_where_indexes.length) return next_where

  // Splice descending so each removal leaves the remaining indexes valid.
  removed_where_indexes.sort((left, right) => right - left)
  for (const where_index of removed_where_indexes) {
    next_where.splice(where_index, 1)
  }

  return next_where
}

export default resolve_column_filter_state
