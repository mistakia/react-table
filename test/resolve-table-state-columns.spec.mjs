/* global describe it */
import { expect } from 'chai'

import resolve_table_state_columns from '#src/utils/resolve-table-state-columns.js'

// The union the row-axes picker offers, derived the same way
// TableRowAxesControls derives it from the resolved columns.
const supported_row_axes = (columns) => [
  ...new Set(columns.flatMap((column) => column.row_axes).filter(Boolean))
]

// The shape the per-instance resolution exists for: a betting column can only
// be split by line when its market posts a ladder of lines. A single-line
// market has no rungs to spread a row across, so the axis must not be offered
// for it even though the same column id offers it for a ladder market.
const ladder_market_types = new Set(['GAME_ALT_PASSING_YARDS'])

const betting_column = {
  column_id: 'player_game_prop',
  column_name: 'player_game_prop',
  row_axes: (params) => {
    const market_type = Array.isArray(params.market_type)
      ? params.market_type[0]
      : params.market_type
    return ladder_market_types.has(market_type)
      ? ['year', 'week', 'line']
      : ['year', 'week']
  }
}

const all_columns = {
  player_game_prop: betting_column,
  plain: {
    column_id: 'plain',
    column_name: 'plain',
    row_axes: ['year', 'week']
  },
  no_axes: { column_id: 'no_axes', column_name: 'no_axes' },
  formatted: {
    column_id: 'formatted',
    column_name: 'formatted',
    fixed: (params) => (params.rate ? 2 : 0),
    reverse_percentiles: (params) => Boolean(params.lower_is_better)
  }
}

describe('resolve_table_state_columns', () => {
  it('resolves row_axes from a function of the column instance params', () => {
    const columns = resolve_table_state_columns({
      table_state: {
        columns: [
          {
            column_id: 'player_game_prop',
            params: { market_type: ['GAME_ALT_PASSING_YARDS'] }
          }
        ]
      },
      all_columns
    })

    expect(columns[0].row_axes).to.deep.equal(['year', 'week', 'line'])
  })

  it('withholds the line axis from a market that posts no ladder', () => {
    const columns = resolve_table_state_columns({
      table_state: {
        columns: [
          {
            column_id: 'player_game_prop',
            params: { market_type: ['GAME_PASSING_YARDS'] }
          }
        ]
      },
      all_columns
    })

    expect(columns[0].row_axes).to.deep.equal(['year', 'week'])
    expect(columns[0].row_axes).to.not.include('line')
  })

  it('offers line in the picker union only while a ladder column is selected', () => {
    const ladder_instance = {
      column_id: 'player_game_prop',
      params: { market_type: ['GAME_ALT_PASSING_YARDS'] }
    }
    const single_line_instance = {
      column_id: 'player_game_prop',
      params: { market_type: ['GAME_PASSING_YARDS'] }
    }

    const without_ladder = supported_row_axes(
      resolve_table_state_columns({
        table_state: { columns: [single_line_instance, 'plain'] },
        all_columns
      })
    )
    expect(without_ladder).to.deep.equal(['year', 'week'])

    const with_ladder = supported_row_axes(
      resolve_table_state_columns({
        table_state: {
          columns: [single_line_instance, ladder_instance, 'plain']
        },
        all_columns
      })
    )
    expect(with_ladder).to.deep.equal(['year', 'week', 'line'])
  })

  it('leaves a plain row_axes array and a column without one alone', () => {
    const columns = resolve_table_state_columns({
      table_state: { columns: ['plain', 'no_axes'] },
      all_columns
    })

    expect(columns[0].row_axes).to.deep.equal(['year', 'week'])
    expect(columns[1].row_axes).to.equal(undefined)
    // The picker's own render gate: no declared axis means no control at all.
    expect(supported_row_axes([columns[1]])).to.deep.equal([])
  })

  it('resolves fixed and reverse_percentiles per instance', () => {
    const columns = resolve_table_state_columns({
      table_state: {
        columns: [
          { column_id: 'formatted', params: { rate: true } },
          { column_id: 'formatted', params: { lower_is_better: true } }
        ]
      },
      all_columns
    })

    expect(columns[0].fixed).to.equal(2)
    expect(columns[0].reverse_percentiles).to.equal(false)
    expect(columns[1].fixed).to.equal(0)
    expect(columns[1].reverse_percentiles).to.equal(true)
  })

  it('indexes columns after the prefix columns and skips unknown ids', () => {
    const columns = resolve_table_state_columns({
      table_state: {
        prefix_columns: ['player_name', 'team'],
        columns: ['plain', 'not_a_column', 'no_axes']
      },
      all_columns
    })

    expect(columns.map((column) => column.column_id)).to.deep.equal([
      'plain',
      'no_axes'
    ])
    expect(columns.map((column) => column.index)).to.deep.equal([2, 3])
  })
})
