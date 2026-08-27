import { describe, it } from 'mocha'
import { expect } from 'chai'

import resolve_sticky_column_ids from '../src/utils/resolve-sticky-column-ids.js'

// The Rookie Draft Prospects prefix set, the case that motivated the budget:
// 470px of pinned columns on a 390px phone left no width for any data column.
const prefix_columns = [
  { id: 'prefix-player_name', size: 150 },
  { id: 'prefix-player_position', size: 50 },
  { id: 'prefix-player_nfl_teams', size: 70 },
  { id: 'prefix-player_college', size: 150 },
  { id: 'prefix-player_league_roster_status', size: 50 }
]

const make_columns = (columns = prefix_columns) =>
  columns.map(({ id, size }) => ({ id, getSize: () => size }))

const resolve = (container_width, columns) => [
  ...resolve_sticky_column_ids({
    sticky_columns: make_columns(columns),
    container_width
  })
]

describe('resolve_sticky_column_ids', () => {
  it('pins every column when the budget covers them all', () => {
    expect(resolve(1400)).to.have.lengthOf(5)
  })

  it('drops the columns past the budget on a phone width', () => {
    // 50% of 390 is 195: name (150) fits, name + position (200) does not.
    expect(resolve(390)).to.deep.equal(['prefix-player_name'])
  })

  it('keeps the pinned set a contiguous prefix rather than skipping a wide column', () => {
    // 50% of 800 is 400: the first three total 270, adding college (150) would
    // reach 420, and roster status (50) must not be admitted past it.
    expect(resolve(800)).to.deep.equal([
      'prefix-player_name',
      'prefix-player_position',
      'prefix-player_nfl_teams'
    ])
  })

  it('always pins the first column even when it alone exceeds the budget', () => {
    expect(resolve(200)).to.deep.equal(['prefix-player_name'])
  })

  it('pins everything while the container width is unmeasured', () => {
    expect(resolve(0)).to.have.lengthOf(5)
  })

  it('returns an empty set when no column is declared sticky', () => {
    expect(resolve(390, [])).to.deep.equal([])
  })
})
