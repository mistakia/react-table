/* global describe it */
import { expect } from 'chai'

import resolve_row_axis_conflicts from '#src/utils/resolve-row-axis-conflicts.js'
import resolve_table_state_columns from '#src/utils/resolve-table-state-columns.js'

// The domain shape this exists for. league's line axis keys each row on a
// betting line, so two ladder columns on different markets would juxtapose
// "49.5 receiving yards" and "49.5 receptions" on one row. Both columns offer
// `line` honestly -- each one's own market IS a ladder -- so the union the
// picker computes cannot see the disagreement and only the declared domain can.
const ladder_market_types = new Set([
  'GAME_ALT_RECEIVING_YARDS',
  'GAME_ALT_RECEPTIONS'
])

const market_type_of = (params) =>
  Array.isArray(params.market_type) ? params.market_type[0] : params.market_type

const betting_column = (column_id) => ({
  column_id,
  column_title: column_id,
  row_axes: (params) =>
    ladder_market_types.has(market_type_of(params))
      ? ['year', 'week', 'line']
      : ['year', 'week'],
  row_axis_domain: (params) =>
    ladder_market_types.has(market_type_of(params))
      ? { line: market_type_of(params) }
      : {}
})

// Offers the axis and says nothing about ITS domain, declaring one for a
// different axis instead. league has no column of this shape today, because
// its row_axes and row_axis_domain branch on the same ladder test and so always
// agree -- but the per-axis lookup is what makes them independent, and without
// a fixture the "silence is not disagreement" branch is unreachable and
// therefore untested. Mutating that branch to count undefined domains passes
// every other case here.
const offers_line_without_a_line_domain = {
  column_id: 'rung_agnostic',
  column_title: 'Rung Agnostic',
  row_axes: ['year', 'week', 'line'],
  row_axis_domain: { year: 'SEASON' }
}

const all_columns = {
  prop_line: betting_column('prop_line'),
  prop_odds: betting_column('prop_odds'),
  player_name: { column_id: 'player_name', column_title: 'Name' },
  rung_agnostic: offers_line_without_a_line_domain
}

const resolve = (columns) =>
  resolve_row_axis_conflicts({
    table_state_columns: resolve_table_state_columns({
      table_state: { columns },
      all_columns
    })
  })

const with_market = (column_id, market_type) => ({
  column_id,
  params: { market_type: [market_type] }
})

describe('resolve_row_axis_conflicts', function () {
  it('reports no conflict for one ladder market across two columns', () => {
    // The point of the feature: line shopping. Two columns reading different
    // VALUES of one market share every rung and must stay legal.
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_odds', 'GAME_ALT_RECEIVING_YARDS')
    ])
    expect(conflicts).to.deep.equal({})
  })

  it('reports a conflict for two ladder markets', () => {
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_line', 'GAME_ALT_RECEPTIONS')
    ])
    expect(Object.keys(conflicts)).to.deep.equal(['line'])
    expect(
      conflicts.line.groups.map((group) => group.domain).sort()
    ).to.deep.equal(['GAME_ALT_RECEIVING_YARDS', 'GAME_ALT_RECEPTIONS'])
  })

  it('treats an undeclared domain on an offered axis as silence', () => {
    // Silence is not disagreement. A column can offer the axis and contribute
    // no rows of its own to it, and pairing that with a real ladder must stay
    // legal -- otherwise the first such column refuses every view it joins.
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      'rung_agnostic'
    ])
    expect(conflicts).to.deep.equal({})
  })

  it('does not count a single-line column as a second quantity', () => {
    // A standard market posts one selection per player-game, contributes no
    // rungs, and is a legitimate neighbour. Note this one is carried by the
    // ROW_AXES resolution rather than by the domain lookup -- a single-line
    // column does not offer `line` at all, so it never reaches the axis loop.
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_odds', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_line', 'GAME_RECEIVING_YARDS')
    ])
    expect(conflicts).to.deep.equal({})
  })

  it('ignores a column that declares no domain at all', () => {
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      'player_name'
    ])
    expect(conflicts).to.deep.equal({})
  })

  it('names each column instance once per domain', () => {
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_odds', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_line', 'GAME_ALT_RECEPTIONS'),
      with_market('prop_odds', 'GAME_ALT_RECEPTIONS')
    ])
    for (const group of conflicts.line.groups) {
      expect(group.column_ids).to.deep.equal(['prop_line', 'prop_odds'])
    }
  })

  it('does not report an axis the columns agree on', () => {
    // A conflict on `line` must not take `year` and `week` down with it --
    // those axes carry no domain and are shareable by everybody.
    const conflicts = resolve([
      with_market('prop_line', 'GAME_ALT_RECEIVING_YARDS'),
      with_market('prop_line', 'GAME_ALT_RECEPTIONS')
    ])
    expect(conflicts.year).to.equal(undefined)
    expect(conflicts.week).to.equal(undefined)
  })

  it('returns nothing for an empty column set', () => {
    expect(resolve_row_axis_conflicts()).to.deep.equal({})
  })
})
