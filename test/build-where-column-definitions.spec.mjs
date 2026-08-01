import { describe, it } from 'mocha'
import { expect } from 'chai'

import build_where_column_definitions from '../src/utils/build-where-column-definitions.js'

const all_columns = [
  { column_id: 'player_name', column_title: 'Name' },
  { column_id: 'player_age', column_title: 'Age' }
]

describe('build_where_column_definitions', () => {
  it('resolves each where entry to its column definition', () => {
    const result = build_where_column_definitions(
      [{ column_id: 'player_name' }, { column_id: 'player_age' }],
      all_columns
    )
    expect(result.map((c) => c.column_id)).to.deep.equal([
      'player_name',
      'player_age'
    ])
  })

  it('carries where params through as selected_params', () => {
    const result = build_where_column_definitions(
      [{ column_id: 'player_name', params: { year: [2024] } }],
      all_columns
    )
    expect(result[0].selected_params).to.deep.equal({ year: [2024] })
  })

  it('accepts the id and column_name aliases for column_id', () => {
    const result = build_where_column_definitions(
      [{ id: 'player_name' }, { column_name: 'player_age' }],
      all_columns
    )
    expect(result.map((c) => c.column_id)).to.deep.equal([
      'player_name',
      'player_age'
    ])
  })

  // The regression this module exists for: a filter naming a column that is not
  // in all_columns (stale saved view, or all_columns not yet loaded) must yield
  // a null hole, NOT be dropped. Compacting shifted every later definition onto
  // the wrong row and ran off the end of the array, which surfaced in
  // production as `Cannot destructure property 'column_id' from null or
  // undefined value` inside FilterItem.
  it('null-pads an unresolved column rather than compacting it out', () => {
    const where = [
      { column_id: 'deleted_column' },
      { column_id: 'player_name' },
      { column_id: 'player_age' }
    ]
    const result = build_where_column_definitions(where, all_columns)

    expect(result).to.have.lengthOf(where.length)
    expect(result[0]).to.equal(null)
    expect(result[1].column_id).to.equal('player_name')
    expect(result[2].column_id).to.equal('player_age')
  })

  it('stays aligned when every column is unresolved', () => {
    const where = [{ column_id: 'gone_a' }, { column_id: 'gone_b' }]
    const result = build_where_column_definitions(where, all_columns)

    expect(result).to.have.lengthOf(2)
    expect(result).to.deep.equal([null, null])
  })

  it('null-pads a where entry carrying no column identifier at all', () => {
    const result = build_where_column_definitions(
      [{ operator: '=' }, { column_id: 'player_name' }],
      all_columns
    )
    expect(result).to.have.lengthOf(2)
    expect(result[0]).to.equal(null)
    expect(result[1].column_id).to.equal('player_name')
  })

  it('null-pads everything when all_columns has not loaded yet', () => {
    const where = [{ column_id: 'player_name' }, { column_id: 'player_age' }]
    expect(build_where_column_definitions(where, [])).to.deep.equal([
      null,
      null
    ])
    expect(build_where_column_definitions(where, undefined)).to.deep.equal([
      null,
      null
    ])
  })

  it('returns an empty array for a missing or empty where', () => {
    expect(build_where_column_definitions(undefined, all_columns)).to.deep.equal(
      []
    )
    expect(build_where_column_definitions([], all_columns)).to.deep.equal([])
  })
})
