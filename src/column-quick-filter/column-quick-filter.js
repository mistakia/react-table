// The header-anchored quick filter: set a bound on the column you are looking
// at without a trip to the side panel.
//
// Every control here writes ordinary `where` rows through
// `column-filter-state.js`. There is no new operator, no new table-state field
// and no parallel filter store, so a saved view or a share link written from
// this panel round-trips against an un-bumped server.
//
// The panel is strictly less expressive than the side panel it sits beside, so
// it never repairs what it cannot render: rows it cannot project are counted
// and pointed at the advanced panel, and left exactly as they were.
//
// Dispatch on `data_type` follows the precedent in
// `src/parameters-editor/parameters-editor-item.js` -- a closed set of types,
// one shared commit contract, one file. `undefined` is a REACHABLE data_type,
// not a defensive branch: a consumer can set a constant that does not exist,
// and that column must still get a menu.

import React, { useContext, useMemo, useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'

import { table_context } from '#src/table-context'
import { TABLE_DATA_TYPES, TABLE_OPERATORS } from '#src/constants.mjs'
import {
  resolve_column_filter_state,
  apply_column_filter_state
} from '#src/utils/column-filter-state.js'

import './column-quick-filter.styl'

// Every commit is a refetch in the consumer, so the interval is a stated cost
// rather than an implementation detail. A quick filter that needs a second
// click to take effect is not quick, which is why this debounces instead of
// putting an Apply button on the panel.
export const QUICK_FILTER_COMMIT_DELAY_MS = 500

const DATA_TYPES_WITH_A_BODY = [
  TABLE_DATA_TYPES.NUMBER,
  TABLE_DATA_TYPES.DATE,
  TABLE_DATA_TYPES.TEXT,
  TABLE_DATA_TYPES.SELECT,
  TABLE_DATA_TYPES.BOOLEAN
]

// The debounced commit reads table_state off a ref rather than closing over
// it. A commit scheduled before an unrelated state change would otherwise
// write the where array it captured and silently revert that change.
const use_debounced_commit = ({ table_state, on_table_state_change }) => {
  const table_state_ref = useRef(table_state)
  const timer_ref = useRef(null)

  useEffect(() => {
    table_state_ref.current = table_state
  }, [table_state])

  useEffect(
    () => () => {
      if (timer_ref.current) clearTimeout(timer_ref.current)
    },
    []
  )

  return useMemo(
    () => ({
      // Typed input: coalesce keystrokes.
      debounced: (build_where) => {
        if (timer_ref.current) clearTimeout(timer_ref.current)
        timer_ref.current = setTimeout(() => {
          const current = table_state_ref.current
          on_table_state_change({
            ...current,
            where: build_where(current.where || [])
          })
        }, QUICK_FILTER_COMMIT_DELAY_MS)
      },
      // A click is already a deliberate commit; waiting half a second after
      // one reads as the control having missed it.
      immediate: (build_where) => {
        if (timer_ref.current) clearTimeout(timer_ref.current)
        const current = table_state_ref.current
        on_table_state_change({
          ...current,
          where: build_where(current.where || [])
        })
      }
    }),
    [on_table_state_change]
  )
}

const NullCheckControls = ({ null_check, commit_slots }) => {
  const set_null_check = (operator) =>
    commit_slots.immediate({
      null_check: null_check?.operator === operator ? null : { operator }
    })

  return (
    <div className='column-quick-filter-row column-quick-filter-null-checks'>
      <div
        className={`column-quick-filter-toggle${
          null_check?.operator === TABLE_OPERATORS.IS_NOT_NULL
            ? ' selected'
            : ''
        }`}
        onClick={() => set_null_check(TABLE_OPERATORS.IS_NOT_NULL)}>
        Has value
      </div>
      <div
        className={`column-quick-filter-toggle${
          null_check?.operator === TABLE_OPERATORS.IS_NULL ? ' selected' : ''
        }`}
        onClick={() => set_null_check(TABLE_OPERATORS.IS_NULL)}>
        Is empty
      </div>
    </div>
  )
}

NullCheckControls.propTypes = {
  null_check: PropTypes.object,
  commit_slots: PropTypes.object.isRequired
}

// A draft input holds what the user is typing and re-seeds itself whenever the
// committed value changes underneath it. Without the re-seed, clearing a
// filter elsewhere leaves a stale number sitting in the box.
const DraftInput = ({ label, type, committed_value, on_draft_change }) => {
  const [draft, set_draft] = useState(
    committed_value === undefined || committed_value === null
      ? ''
      : String(committed_value)
  )

  useEffect(() => {
    set_draft(
      committed_value === undefined || committed_value === null
        ? ''
        : String(committed_value)
    )
  }, [committed_value])

  return (
    <TextField
      label={label}
      type={type}
      size='small'
      variant='outlined'
      value={draft}
      onChange={(event) => {
        set_draft(event.target.value)
        on_draft_change(event.target.value)
      }}
    />
  )
}

DraftInput.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  committed_value: PropTypes.any,
  on_draft_change: PropTypes.func.isRequired
}

const RangeBody = ({ filter_state, commit_slots, data_type }) => {
  const input_type = data_type === TABLE_DATA_TYPES.DATE ? 'date' : 'number'
  const parse = (raw) => {
    if (raw === '') return null
    return input_type === 'number' ? Number(raw) : raw
  }
  const set_slot = (slot, operator) => (raw) => {
    const value = parse(raw)
    // A number input yields NaN mid-typing (a lone '-', an incomplete
    // exponent). Committing NaN writes a filter the server rejects, so hold.
    if (typeof value === 'number' && Number.isNaN(value)) return
    commit_slots.debounced({
      [slot]: value === null ? null : { operator, value }
    })
  }

  return (
    <>
      <div className='column-quick-filter-row'>
        <DraftInput
          label='Min'
          type={input_type}
          committed_value={filter_state.lower_bound?.value}
          on_draft_change={set_slot(
            'lower_bound',
            filter_state.lower_bound?.operator ||
              TABLE_OPERATORS.GREATER_THAN_OR_EQUAL
          )}
        />
        <DraftInput
          label='Max'
          type={input_type}
          committed_value={filter_state.upper_bound?.value}
          on_draft_change={set_slot(
            'upper_bound',
            filter_state.upper_bound?.operator ||
              TABLE_OPERATORS.LESS_THAN_OR_EQUAL
          )}
        />
      </div>
      <div className='column-quick-filter-row'>
        <DraftInput
          label='Exactly'
          type={input_type}
          committed_value={filter_state.exact_value?.value}
          on_draft_change={set_slot(
            'exact_value',
            filter_state.exact_value?.operator || TABLE_OPERATORS.EQUAL
          )}
        />
      </div>
      <NullCheckControls
        null_check={filter_state.null_check}
        commit_slots={commit_slots}
      />
    </>
  )
}

RangeBody.propTypes = {
  filter_state: PropTypes.object.isRequired,
  commit_slots: PropTypes.object.isRequired,
  data_type: PropTypes.number
}

// Equals leads and Contains follows, because most TEXT columns in practice are
// external-system identifier fields where a substring match is semantically
// wrong -- matching a fragment of an ESPN id answers no question anyone asked.
const TextBody = ({ filter_state, commit_slots }) => {
  const is_negated =
    filter_state.text_match?.operator === TABLE_OPERATORS.NOT_ILIKE

  return (
    <>
      <div className='column-quick-filter-row'>
        <DraftInput
          label='Equals'
          committed_value={filter_state.exact_value?.value}
          on_draft_change={(raw) =>
            commit_slots.debounced({
              exact_value:
                raw === ''
                  ? null
                  : {
                      operator:
                        filter_state.exact_value?.operator ||
                        TABLE_OPERATORS.EQUAL,
                      value: raw
                    }
            })
          }
        />
      </div>
      <div className='column-quick-filter-row'>
        <DraftInput
          label={is_negated ? 'Does not contain' : 'Contains'}
          committed_value={filter_state.text_match?.value}
          on_draft_change={(raw) =>
            commit_slots.debounced({
              text_match:
                raw === ''
                  ? null
                  : {
                      operator: is_negated
                        ? TABLE_OPERATORS.NOT_ILIKE
                        : TABLE_OPERATORS.ILIKE,
                      value: raw
                    }
            })
          }
        />
      </div>
      <div className='column-quick-filter-row'>
        <div
          className='column-quick-filter-checkbox'
          onClick={() =>
            commit_slots.immediate({
              text_match: filter_state.text_match
                ? {
                    operator: is_negated
                      ? TABLE_OPERATORS.ILIKE
                      : TABLE_OPERATORS.NOT_ILIKE,
                    value: filter_state.text_match.value
                  }
                : null
            })
          }>
          <Checkbox checked={is_negated} size='small' />
          <div>Invert to does not contain</div>
        </div>
      </div>
      <NullCheckControls
        null_check={filter_state.null_check}
        commit_slots={commit_slots}
      />
    </>
  )
}

TextBody.propTypes = {
  filter_state: PropTypes.object.isRequired,
  commit_slots: PropTypes.object.isRequired
}

const column_value_value = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.value
    : column_value
const column_value_label = (column_value) =>
  typeof column_value === 'object' && column_value !== null
    ? column_value.label
    : column_value

const ValueSetBody = ({ filter_state, commit_slots, column_values }) => {
  const is_excluded =
    filter_state.value_set?.operator === TABLE_OPERATORS.NOT_IN
  const selected = Array.isArray(filter_state.value_set?.value)
    ? filter_state.value_set.value
    : []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    commit_slots.immediate({
      value_set: next.length
        ? {
            operator: is_excluded ? TABLE_OPERATORS.NOT_IN : TABLE_OPERATORS.IN,
            value: next
          }
        : null
    })
  }

  if (!column_values.length) {
    return (
      <div className='column-quick-filter-note'>
        This column offers no values to pick from.
      </div>
    )
  }

  return (
    <>
      <div className='column-quick-filter-row'>
        <div
          className='column-quick-filter-checkbox'
          onClick={() =>
            commit_slots.immediate({
              value_set: selected.length
                ? {
                    operator: is_excluded
                      ? TABLE_OPERATORS.IN
                      : TABLE_OPERATORS.NOT_IN,
                    value: selected
                  }
                : null
            })
          }>
          <Checkbox checked={is_excluded} size='small' />
          <div>Exclude the selected values</div>
        </div>
      </div>
      <div className='column-quick-filter-value-list'>
        {column_values.map((column_value, index) => {
          const value = column_value_value(column_value)
          return (
            <div
              key={index}
              className='column-quick-filter-checkbox'
              onClick={() => toggle(value)}>
              <Checkbox checked={selected.includes(value)} size='small' />
              <div>{column_value_label(column_value)}</div>
            </div>
          )
        })}
      </div>
      <NullCheckControls
        null_check={filter_state.null_check}
        commit_slots={commit_slots}
      />
    </>
  )
}

ValueSetBody.propTypes = {
  filter_state: PropTypes.object.isRequired,
  commit_slots: PropTypes.object.isRequired,
  column_values: PropTypes.array.isRequired
}

const BooleanBody = ({ filter_state, commit_slots }) => {
  const current = filter_state.exact_value
  const is_equality = current?.operator === TABLE_OPERATORS.EQUAL
  const set_value = (value) =>
    commit_slots.immediate({
      exact_value:
        value === null ? null : { operator: TABLE_OPERATORS.EQUAL, value }
    })

  return (
    <>
      <div className='column-quick-filter-row column-quick-filter-null-checks'>
        <div
          className={`column-quick-filter-toggle${
            is_equality && current.value === true ? ' selected' : ''
          }`}
          onClick={() => set_value(true)}>
          True
        </div>
        <div
          className={`column-quick-filter-toggle${
            is_equality && current.value === false ? ' selected' : ''
          }`}
          onClick={() => set_value(false)}>
          False
        </div>
        <div
          className={`column-quick-filter-toggle${current ? '' : ' selected'}`}
          onClick={() => set_value(null)}>
          Any
        </div>
      </div>
      <NullCheckControls
        null_check={filter_state.null_check}
        commit_slots={commit_slots}
      />
    </>
  )
}

BooleanBody.propTypes = {
  filter_state: PropTypes.object.isRequired,
  commit_slots: PropTypes.object.isRequired
}

export default function ColumnQuickFilter({
  column_id,
  column_index = 0,
  data_type,
  params
}) {
  const {
    table_state,
    on_table_state_change,
    all_columns,
    set_filter_controls_open
  } = useContext(table_context)

  const commit = use_debounced_commit({ table_state, on_table_state_change })

  const filter_state = useMemo(
    () =>
      resolve_column_filter_state({
        where: table_state.where,
        column_id,
        column_index
      }),
    [table_state.where, column_id, column_index]
  )

  const commit_slots = useMemo(() => {
    const build = (next_state) => (where) =>
      apply_column_filter_state({
        where,
        column_id,
        column_index,
        params,
        next_state
      })
    return {
      debounced: (next_state) => commit.debounced(build(next_state)),
      immediate: (next_state) => commit.immediate(build(next_state))
    }
  }, [commit, column_id, column_index, params])

  const column_values = all_columns?.[column_id]?.column_values || []
  const has_body = DATA_TYPES_WITH_A_BODY.includes(data_type)
  const unrepresentable_count =
    filter_state.unrepresentable_where_indexes.length

  const advanced_link = (
    <div
      className='column-quick-filter-advanced'
      onClick={() => set_filter_controls_open(true)}>
      Advanced filter
    </div>
  )

  if (!has_body) {
    return (
      <div className='column-quick-filter'>
        <div className='column-quick-filter-note'>
          This column type has no quick filter.
        </div>
        {advanced_link}
      </div>
    )
  }

  return (
    <div className='column-quick-filter'>
      {data_type === TABLE_DATA_TYPES.NUMBER ||
      data_type === TABLE_DATA_TYPES.DATE ? (
        <RangeBody {...{ filter_state, commit_slots, data_type }} />
      ) : null}
      {data_type === TABLE_DATA_TYPES.TEXT ? (
        <TextBody {...{ filter_state, commit_slots }} />
      ) : null}
      {data_type === TABLE_DATA_TYPES.SELECT ? (
        <ValueSetBody {...{ filter_state, commit_slots, column_values }} />
      ) : null}
      {data_type === TABLE_DATA_TYPES.BOOLEAN ? (
        <BooleanBody {...{ filter_state, commit_slots }} />
      ) : null}
      {Boolean(unrepresentable_count) && (
        <div className='column-quick-filter-note'>
          {unrepresentable_count === 1
            ? '1 filter on this column is not shown here.'
            : `${unrepresentable_count} filters on this column are not shown here.`}
        </div>
      )}
      {advanced_link}
    </div>
  )
}

ColumnQuickFilter.propTypes = {
  column_id: PropTypes.string.isRequired,
  column_index: PropTypes.number,
  data_type: PropTypes.number,
  params: PropTypes.object
}
