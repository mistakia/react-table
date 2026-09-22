import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  resolve_column_filter_state,
  apply_column_filter_state
} from '../src/utils/column-filter-state.js'

describe('resolve_column_filter_state', () => {
  it('reads a lower bound only', () => {
    const state = resolve_column_filter_state({
      where: [{ column_id: 'player_age', operator: '>=', value: 25 }],
      column_id: 'player_age'
    })
    expect(state.lower_bound).to.deep.equal({
      operator: '>=',
      value: 25,
      where_index: 0
    })
    expect(state.upper_bound).to.equal(null)
    expect(state.unrepresentable_where_indexes).to.deep.equal([])
  })

  it('reads an upper bound only', () => {
    const state = resolve_column_filter_state({
      where: [{ column_id: 'player_age', operator: '<', value: 30 }],
      column_id: 'player_age'
    })
    expect(state.upper_bound).to.deep.equal({
      operator: '<',
      value: 30,
      where_index: 0
    })
    expect(state.lower_bound).to.equal(null)
  })

  it('reads both bounds of a range as two rows', () => {
    const state = resolve_column_filter_state({
      where: [
        { column_id: 'player_age', operator: '>=', value: 25 },
        { column_id: 'player_age', operator: '<=', value: 30 }
      ],
      column_id: 'player_age'
    })
    expect(state.lower_bound.where_index).to.equal(0)
    expect(state.upper_bound.where_index).to.equal(1)
  })

  it('ignores rows belonging to another column', () => {
    const state = resolve_column_filter_state({
      where: [
        { column_id: 'player_name', operator: '=', value: 'Allen' },
        { column_id: 'player_age', operator: '>=', value: 25 }
      ],
      column_id: 'player_age'
    })
    expect(state.lower_bound.where_index).to.equal(1)
    expect(state.exact_value).to.equal(null)
  })

  it('distinguishes duplicate column ids by column_index', () => {
    const where = [
      { column_id: 'player_age', operator: '>=', value: 25 },
      { column_id: 'player_age', operator: '>=', value: 30, column_index: 1 }
    ]
    expect(
      resolve_column_filter_state({ where, column_id: 'player_age' })
        .lower_bound
    ).to.deep.equal({ operator: '>=', value: 25, where_index: 0 })
    expect(
      resolve_column_filter_state({
        where,
        column_id: 'player_age',
        column_index: 1
      }).lower_bound
    ).to.deep.equal({ operator: '>=', value: 30, where_index: 1 })
  })

  // remove_disabled_params in table.js deletes params in place on commit
  // whenever row_axes is non-empty, so the stored row's params need not equal
  // the column instance's. Matching must not consult them either way -- the
  // structural guarantee is that resolve takes no params argument at all, and
  // the discriminating case is the apply round trip below.
  it('matches a row whatever params it carries', () => {
    for (const params of [undefined, {}, { year: [2024] }, { year: [2023] }]) {
      const state = resolve_column_filter_state({
        where: [{ column_id: 'player_age', operator: '>=', value: 25, params }],
        column_id: 'player_age'
      })
      expect(state.lower_bound, JSON.stringify(params)).to.not.equal(null)
    }
  })

  it('reports a second row tying on the same key and slot as unrepresentable', () => {
    const state = resolve_column_filter_state({
      where: [
        { column_id: 'player_age', operator: '>=', value: 25 },
        { column_id: 'player_age', operator: '>', value: 30 }
      ],
      column_id: 'player_age'
    })
    expect(state.lower_bound.where_index).to.equal(0)
    expect(state.unrepresentable_where_indexes).to.deep.equal([1])
  })

  it('resolves text, value set and null check slots', () => {
    const state = resolve_column_filter_state({
      where: [
        { column_id: 'player_position', operator: 'IN', value: ['QB', 'RB'] },
        { column_id: 'player_position', operator: 'IS NOT NULL' }
      ],
      column_id: 'player_position'
    })
    expect(state.value_set.value).to.deep.equal(['QB', 'RB'])
    expect(state.null_check.operator).to.equal('IS NOT NULL')
  })

  it('resolves a case-insensitive text match', () => {
    const state = resolve_column_filter_state({
      where: [{ column_id: 'player_name', operator: 'ILIKE', value: 'allen' }],
      column_id: 'player_name'
    })
    expect(state.text_match).to.deep.equal({
      operator: 'ILIKE',
      value: 'allen',
      where_index: 0
    })
  })

  it('names a column by id, name or alternative identifier', () => {
    for (const key of ['column_id', 'id', 'column_name']) {
      const state = resolve_column_filter_state({
        where: [{ [key]: 'player_age', operator: '>=', value: 25 }],
        column_id: 'player_age'
      })
      expect(state.lower_bound, key).to.not.equal(null)
    }
  })
})

describe('apply_column_filter_state', () => {
  it('appends a lower bound to an empty where', () => {
    const next = apply_column_filter_state({
      where: [],
      column_id: 'player_age',
      next_state: { lower_bound: { operator: '>=', value: 25 } }
    })
    expect(next).to.deep.equal([
      { column_id: 'player_age', operator: '>=', value: 25 }
    ])
  })

  it('rewrites a held bound in place rather than appending', () => {
    const next = apply_column_filter_state({
      where: [
        { column_id: 'player_name', operator: '=', value: 'Allen' },
        { column_id: 'player_age', operator: '>=', value: 25 }
      ],
      column_id: 'player_age',
      next_state: { lower_bound: { operator: '>=', value: 30 } }
    })
    expect(next).to.have.lengthOf(2)
    expect(next[1].value).to.equal(30)
  })

  it('leaves every untouched index byte-identical', () => {
    const other = { column_id: 'player_name', operator: '=', value: 'Allen' }
    const next = apply_column_filter_state({
      where: [other, { column_id: 'player_age', operator: '>=', value: 25 }],
      column_id: 'player_age',
      next_state: { lower_bound: { operator: '>', value: 26 } }
    })
    expect(next[0]).to.equal(other)
  })

  it('splices on clear and leaves the surviving indexes valid', () => {
    const next = apply_column_filter_state({
      where: [
        { column_id: 'player_age', operator: '>=', value: 25 },
        { column_id: 'player_name', operator: '=', value: 'Allen' },
        { column_id: 'player_age', operator: '<=', value: 30 }
      ],
      column_id: 'player_age',
      next_state: { lower_bound: null, upper_bound: null }
    })
    expect(next).to.deep.equal([
      { column_id: 'player_name', operator: '=', value: 'Allen' }
    ])
  })

  it('leaves a slot absent from next_state untouched', () => {
    const next = apply_column_filter_state({
      where: [{ column_id: 'player_age', operator: '<=', value: 30 }],
      column_id: 'player_age',
      next_state: { lower_bound: { operator: '>=', value: 25 } }
    })
    expect(next).to.have.lengthOf(2)
    expect(next[0].operator).to.equal('<=')
  })

  it('writes params and column_index onto a row it creates', () => {
    const next = apply_column_filter_state({
      where: [],
      column_id: 'player_age',
      column_index: 1,
      params: { year: [2024] },
      next_state: { lower_bound: { operator: '>=', value: 25 } }
    })
    expect(next[0]).to.deep.equal({
      column_id: 'player_age',
      operator: '>=',
      value: 25,
      column_index: 1,
      params: { year: [2024] }
    })
  })

  it('omits value on a null check', () => {
    const next = apply_column_filter_state({
      where: [],
      column_id: 'player_age',
      next_state: { null_check: { operator: 'IS NULL' } }
    })
    expect(next[0]).to.deep.equal({
      column_id: 'player_age',
      operator: 'IS NULL'
    })
  })

  it('round-trips an unrepresentable row byte-identical', () => {
    const unrepresentable = {
      column_id: 'player_age',
      operator: '>',
      value: 40
    }
    const where = [
      { column_id: 'player_age', operator: '>=', value: 25 },
      unrepresentable
    ]
    const next = apply_column_filter_state({
      where,
      column_id: 'player_age',
      next_state: { lower_bound: { operator: '>=', value: 30 } }
    })
    expect(next[1]).to.equal(unrepresentable)
  })

  // The regression the matching key exists to prevent: the stored row's params
  // were stripped by remove_disabled_params, the caller still holds the column
  // instance's params, and a params-bearing key would fail to match and append
  // a second, contradictory bound instead of rewriting the first.
  it('rewrites rather than duplicates a row whose params were stripped', () => {
    const next = apply_column_filter_state({
      where: [
        { column_id: 'player_age', operator: '>=', value: 25, params: {} }
      ],
      column_id: 'player_age',
      params: { year: [2024] },
      next_state: { lower_bound: { operator: '>=', value: 30 } }
    })
    expect(next).to.have.lengthOf(1)
    expect(next[0].value).to.equal(30)
  })

  it('does not mutate the input array', () => {
    const where = [{ column_id: 'player_age', operator: '>=', value: 25 }]
    apply_column_filter_state({
      where,
      column_id: 'player_age',
      next_state: { lower_bound: null }
    })
    expect(where).to.have.lengthOf(1)
  })
})
