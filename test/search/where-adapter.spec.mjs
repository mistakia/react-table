import { describe, it } from 'mocha'
import { expect } from 'chai'

import where_adapter from '../../src/search/adapters/where.js'

describe('where adapter', () => {
  it('validate rejects missing column_id', () => {
    expect(where_adapter.validate({})).to.match(/column_id/)
    expect(where_adapter.validate({ column_id: 'title' })).to.equal(null)
  })

  it('non-empty query writes a single ILIKE entry preserving siblings', async () => {
    const table_state = {
      where: [
        { column_id: 'status', operator: '=', value: 'open' },
        { column_id: 'title', operator: 'ILIKE', value: 'old' }
      ]
    }
    const result = await where_adapter.run({
      query: 'new',
      table_state,
      view_search_config: { column_id: 'title' }
    })
    expect(result).to.deep.equal({
      state_patch: {
        where: [
          { column_id: 'status', operator: '=', value: 'open' },
          { column_id: 'title', operator: 'ILIKE', value: 'new' }
        ]
      }
    })
  })

  it('empty query removes the entry, leaving siblings intact', async () => {
    const table_state = {
      where: [
        { column_id: 'status', operator: '=', value: 'open' },
        { column_id: 'title', operator: 'ILIKE', value: 'old' }
      ]
    }
    const result = await where_adapter.run({
      query: '   ',
      table_state,
      view_search_config: { column_id: 'title' }
    })
    expect(result.state_patch.where).to.deep.equal([
      { column_id: 'status', operator: '=', value: 'open' }
    ])
  })

  it('respects custom operator override', async () => {
    const result = await where_adapter.run({
      query: 'foo',
      table_state: { where: [] },
      view_search_config: { column_id: 'title', operator: 'LIKE' }
    })
    expect(result.state_patch.where[0]).to.deep.equal({
      column_id: 'title',
      operator: 'LIKE',
      value: 'foo'
    })
  })
})
