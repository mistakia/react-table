import { describe, expect, test } from 'bun:test'

import where_adapter from '../../src/search/adapters/where.js'

describe('where adapter', () => {
  test('validate rejects missing column_id', () => {
    expect(where_adapter.validate({})).toMatch(/column_id/)
    expect(where_adapter.validate({ column_id: 'title' })).toBeNull()
  })

  test('non-empty query writes a single ILIKE entry preserving siblings', async () => {
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
    expect(result).toEqual({
      state_patch: {
        where: [
          { column_id: 'status', operator: '=', value: 'open' },
          { column_id: 'title', operator: 'ILIKE', value: 'new' }
        ]
      }
    })
  })

  test('empty query removes the entry, leaving siblings intact', async () => {
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
    expect(result.state_patch.where).toEqual([
      { column_id: 'status', operator: '=', value: 'open' }
    ])
  })

  test('respects custom operator override', async () => {
    const result = await where_adapter.run({
      query: 'foo',
      table_state: { where: [] },
      view_search_config: { column_id: 'title', operator: 'LIKE' }
    })
    expect(result.state_patch.where[0]).toEqual({
      column_id: 'title',
      operator: 'LIKE',
      value: 'foo'
    })
  })
})
