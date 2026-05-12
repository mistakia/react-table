import { describe, it } from 'mocha'
import { expect } from 'chai'

import { fuzzy_match } from '../src/utils/fuzzy-match.js'

describe('fuzzy_match — legacy string signature', () => {
  it('returns false when needle is empty', () => {
    expect(fuzzy_match('', 'hello world')).to.equal(false)
  })

  it('returns false when haystack is empty', () => {
    expect(fuzzy_match('hello', '')).to.equal(false)
  })

  it('matches identical strings', () => {
    expect(fuzzy_match('hello', 'hello')).to.equal(true)
  })

  it('matches subsequence (case-insensitive)', () => {
    expect(fuzzy_match('QB', 'Quarterback Stats')).to.equal(true)
  })

  it('does not match when characters are not present', () => {
    expect(fuzzy_match('xyz', 'hello world')).to.equal(false)
  })

  it('matches multi-word needle where each word matches separately', () => {
    expect(fuzzy_match('rb proj', 'RB Weekly Projections')).to.equal(true)
  })
})

describe('fuzzy_match — extended view-object signature', () => {
  const make_view = (overrides = {}) => ({
    view_name: 'Default View',
    view_description: 'A default description',
    view_username: 'testuser',
    tags: [],
    ...overrides
  })

  it('matches on view_name', () => {
    const view = make_view({ view_name: 'QB Betting Props' })
    expect(fuzzy_match('qb', view)).to.equal(true)
  })

  it('matches on view_description', () => {
    const view = make_view({
      view_name: 'Weekly Stats',
      view_description: 'Shows betting market lines'
    })
    expect(fuzzy_match('betting', view)).to.equal(true)
  })

  it('matches on view_username', () => {
    const view = make_view({ view_username: 'trashman' })
    expect(fuzzy_match('trash', view)).to.equal(true)
  })

  it('matches on tag names (object form)', () => {
    const view = make_view({
      view_name: 'Unrelated Title',
      view_description: '',
      view_username: 'other',
      tags: [
        { name: 'fantasy-projection', source: 'user' },
        { name: 'qb', source: 'auto' }
      ]
    })
    expect(fuzzy_match('fantasy', view)).to.equal(true)
  })

  it('matches on tag names (string form)', () => {
    const view = make_view({
      view_name: 'Something',
      tags: ['dynasty-trade', 'weekly-matchup']
    })
    expect(fuzzy_match('dynasty', view)).to.equal(true)
  })

  it('matches llm-sourced tags', () => {
    const view = make_view({
      tags: [{ name: 'situational-efficiency', source: 'llm' }]
    })
    expect(fuzzy_match('situational', view)).to.equal(true)
  })

  it('returns false when no field matches', () => {
    const view = make_view({
      view_name: 'Alpha',
      view_description: 'Beta',
      view_username: 'gamma',
      tags: [{ name: 'delta', source: 'user' }]
    })
    expect(fuzzy_match('zzzz', view)).to.equal(false)
  })

  it('returns false when needle is empty', () => {
    const view = make_view()
    expect(fuzzy_match('', view)).to.equal(false)
  })

  it('handles missing optional fields gracefully', () => {
    const view = { view_name: 'Minimal View' }
    expect(fuzzy_match('minimal', view)).to.equal(true)
    expect(fuzzy_match('zzzz', view)).to.equal(false)
  })

  it('handles null tags array gracefully', () => {
    const view = make_view({ tags: null })
    expect(fuzzy_match('alpha', view)).to.equal(false)
  })
})
