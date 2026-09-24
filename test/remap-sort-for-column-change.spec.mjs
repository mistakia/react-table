import { describe, it } from 'mocha'
import { expect } from 'chai'

import remap_sort_for_column_change, {
  remap_sort_for_removed_column_positions
} from '../src/utils/remap-sort-for-column-change.js'

// The case every one of these defects needed and no fixture in this repo had:
// two columns sharing a column_id, with the sort on the SECOND one. Under a
// column_id-only rule the surviving occurrence either loses a sort it should
// have kept or keeps an ordinal that now points at nothing.
const duplicated_columns = [
  { column_id: 'player_age' },
  { column_id: 'player_team' },
  { column_id: 'player_age' }
]

const sort_on_second_age = [
  { column_id: 'player_age', column_index: 1, desc: true }
]

describe('remap_sort_for_removed_column_positions', () => {
  it('drops the sort when its column is removed', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: [{ column_id: 'player_age', column_index: 0, desc: true }],
      previous_columns: [
        { column_id: 'player_age' },
        { column_id: 'player_team' }
      ],
      removed_positions: [0]
    })

    expect(sort).to.deep.equal([])
  })

  it('keeps a sort whose column was not the one removed', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: [{ column_id: 'player_age', column_index: 0, desc: true }],
      previous_columns: [
        { column_id: 'player_age' },
        { column_id: 'player_team' }
      ],
      removed_positions: [1]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: true }
    ])
  })

  it('re-indexes the survivor when an earlier duplicate is removed', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      removed_positions: [0]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: true }
    ])
  })

  it('keeps the sort on the duplicate that survives, not the one removed', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      removed_positions: [2]
    })

    expect(sort).to.deep.equal([])
  })

  it('removes every clause when every column goes', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      removed_positions: [0, 1, 2]
    })

    expect(sort).to.deep.equal([])
  })

  it('counts a bare-string column as an occurrence', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: sort_on_second_age,
      previous_columns: ['player_age', { column_id: 'player_age' }],
      removed_positions: [0]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: true }
    ])
  })

  it('leaves a clause that was already orphaned before this edit', () => {
    const stale_sort = [
      { column_id: 'player_forty_yard_dash', column_index: 0, desc: true }
    ]

    const sort = remap_sort_for_removed_column_positions({
      sort: stale_sort,
      previous_columns: duplicated_columns,
      removed_positions: [1]
    })

    expect(sort).to.deep.equal(stale_sort)
  })

  it('preserves the order and direction of multiple clauses', () => {
    const sort = remap_sort_for_removed_column_positions({
      sort: [
        { column_id: 'player_age', column_index: 1, desc: false },
        { column_id: 'player_team', column_index: 0, desc: true }
      ],
      previous_columns: duplicated_columns,
      removed_positions: [0]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: false },
      { column_id: 'player_team', column_index: 0, desc: true }
    ])
  })
})

describe('remap_sort_for_column_change', () => {
  it('follows a reordered column so the sort stays on the same one', () => {
    // Drag the second player_age to the front: it becomes occurrence 0, and the
    // one that was occurrence 0 becomes occurrence 1.
    const next_columns = [
      duplicated_columns[2],
      duplicated_columns[0],
      duplicated_columns[1]
    ]

    const sort = remap_sort_for_column_change({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      next_columns,
      next_to_previous_index: [2, 0, 1]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: true }
    ])
  })

  it('re-indexes when a duplicate is inserted ahead of the sorted column', () => {
    const next_columns = [
      { column_id: 'player_age' },
      duplicated_columns[0],
      duplicated_columns[1],
      duplicated_columns[2]
    ]

    const sort = remap_sort_for_column_change({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      next_columns,
      next_to_previous_index: [null, 0, 1, 2]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 2, desc: true }
    ])
  })

  it('drops the sort when its slot is replaced by a different column', () => {
    const next_columns = [
      { column_id: 'player_age' },
      { column_id: 'player_team' },
      { column_id: 'player_height' }
    ]

    const sort = remap_sort_for_column_change({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      next_columns,
      next_to_previous_index: [0, 1, 2]
    })

    expect(sort).to.deep.equal([])
  })

  it('keeps the sort when a replacement writes back the same column_id', () => {
    const next_columns = [
      duplicated_columns[0],
      duplicated_columns[1],
      { column_id: 'player_age', params: { year: [2024] } }
    ]

    const sort = remap_sort_for_column_change({
      sort: sort_on_second_age,
      previous_columns: duplicated_columns,
      next_columns,
      next_to_previous_index: [0, 1, 2]
    })

    expect(sort).to.deep.equal([
      { column_id: 'player_age', column_index: 1, desc: true }
    ])
  })

  it('treats a missing column_index as occurrence zero', () => {
    const sort = remap_sort_for_column_change({
      sort: [{ column_id: 'player_age', desc: true }],
      previous_columns: duplicated_columns,
      next_columns: [duplicated_columns[1], duplicated_columns[2]],
      next_to_previous_index: [1, 2]
    })

    expect(sort).to.deep.equal([])
  })
})
