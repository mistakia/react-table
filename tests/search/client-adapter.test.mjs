import { describe, expect, test } from 'bun:test'

import client_adapter from '../../src/search/adapters/client.js'

describe('client adapter', () => {
  test('validate rejects empty fields', () => {
    expect(client_adapter.validate({ fields: [] })).toMatch(/non-empty/)
    expect(client_adapter.validate({})).toMatch(/non-empty/)
    expect(client_adapter.validate({ fields: ['title'] })).toBeNull()
  })

  test('empty query clears highlights and skips filtering', async () => {
    const rows = [{ id: 'r1', title: 'foo' }]
    const result = await client_adapter.run({
      query: '   ',
      current_rows: rows,
      view_search_config: { fields: ['title'] }
    })
    expect(result.highlights).toEqual({})
    expect(result.client_filter).toBeNull()
  })

  test('filter and highlight ranges across multiple fields', async () => {
    const rows = [
      { id: 'r1', title: 'apple pie', body: 'no match' },
      { id: 'r2', title: 'banana split', body: 'apples and pears' },
      { id: 'r3', title: 'cherry', body: 'no match' }
    ]
    const result = await client_adapter.run({
      query: 'apple',
      current_rows: rows,
      view_search_config: { fields: ['title', 'body'], key_field: 'id' }
    })

    const filtered = result.client_filter(rows)
    expect(filtered).toEqual([rows[0], rows[1]])

    expect(result.highlights.r1).toEqual({
      matched_field: 'title',
      cell_ranges: { title: [{ offset: 0, length: 5 }] },
      snippet: null
    })
    expect(result.highlights.r2.matched_field).toBe('body')
    expect(result.highlights.r2.cell_ranges.body).toEqual([
      { offset: 0, length: 5 }
    ])
    expect(result.highlights.r3).toBeUndefined()
  })

  test('matches multiple occurrences within a single field', async () => {
    const rows = [{ id: 'r1', title: 'foo bar foo baz' }]
    const result = await client_adapter.run({
      query: 'foo',
      current_rows: rows,
      view_search_config: { fields: ['title'], key_field: 'id' }
    })
    expect(result.highlights.r1.cell_ranges.title).toEqual([
      { offset: 0, length: 3 },
      { offset: 8, length: 3 }
    ])
  })

  test('case-insensitive match preserves original text indexes', async () => {
    const rows = [{ id: 'r1', title: 'FooBar' }]
    const result = await client_adapter.run({
      query: 'foo',
      current_rows: rows,
      view_search_config: { fields: ['title'], key_field: 'id' }
    })
    expect(result.highlights.r1.cell_ranges.title).toEqual([
      { offset: 0, length: 3 }
    ])
  })
})
