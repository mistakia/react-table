import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  resolve_chart_column,
  toggle_chart_column
} from '../src/utils/resolve-chart-column.js'

const all_columns = {
  player_rest_of_season_points: { column_id: 'player_rest_of_season_points' },
  player_age: { column_id: 'player_age' }
}

// Two instances of one column, the case the occurrence index exists for.
const leaf_column_defs = [
  {
    id: 'player_age',
    column_id: 'player_age',
    accessorKey: 'player_age',
    index: 0
  },
  {
    id: 'player_rest_of_season_points_b',
    column_id: 'player_rest_of_season_points',
    accessorKey: 'player_rest_of_season_points',
    index: 2
  },
  {
    id: 'player_rest_of_season_points_a',
    column_id: 'player_rest_of_season_points',
    accessorKey: 'player_rest_of_season_points',
    index: 1
  }
]

const table_state_columns = [
  'player_age',
  { column_id: 'player_rest_of_season_points', params: { year: 2025 } },
  { column_id: 'player_rest_of_season_points', params: { year: 2026 } }
]

const resolve = (reference, overrides = {}) =>
  resolve_chart_column({
    reference,
    leaf_column_defs,
    table_state_columns,
    all_columns,
    ...overrides
  })

describe('resolve_chart_column', () => {
  it('returns null for an absent or empty reference', () => {
    expect(resolve(null)).to.equal(null)
    expect(resolve({})).to.equal(null)
  })

  it('resolves an occurrence by definition index, with its live params', () => {
    const resolved = resolve({
      column_id: 'player_rest_of_season_points',
      column_index: 1
    })
    expect(resolved.column).to.equal(all_columns.player_rest_of_season_points)
    expect(resolved.accessor_path).to.equal('player_rest_of_season_points')
    expect(resolved.column_params).to.deep.equal({ year: 2026 })
  })

  it('treats a missing column_index as the first occurrence', () => {
    const resolved = resolve({ column_id: 'player_rest_of_season_points' })
    expect(resolved.accessor_path).to.equal('player_rest_of_season_points')
    expect(resolved.column_params).to.deep.equal({ year: 2025 })
  })

  it('suffixes the accessor path when duplicate column ids are enabled', () => {
    const resolved = resolve(
      { column_id: 'player_rest_of_season_points', column_index: 1 },
      { enable_duplicate_column_ids: true }
    )
    expect(resolved.accessor_path).to.equal('player_rest_of_season_points_1')
  })

  it('gives null params for a column stored as a bare id', () => {
    expect(resolve({ column_id: 'player_age' }).column_params).to.equal(null)
  })

  it('returns null for a column the view no longer holds', () => {
    expect(
      resolve({ column_id: 'player_rest_of_season_points', column_index: 2 })
    ).to.equal(null)
    expect(resolve({ column_id: 'player_targets' })).to.equal(null)
  })
})

describe('toggle_chart_column', () => {
  it('selects a new column and clears the selected one', () => {
    const target = { column_id: 'player_age', column_index: 0 }
    expect(toggle_chart_column(null, target)).to.deep.equal(target)
    expect(toggle_chart_column({ column_id: 'player_age' }, target)).to.equal(
      null
    )
    expect(
      toggle_chart_column({ column_id: 'player_age', column_index: 1 }, target)
    ).to.deep.equal(target)
  })
})
