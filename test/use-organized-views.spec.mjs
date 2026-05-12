import { describe, it } from 'mocha'
import { expect } from 'chai'

// Test the pure pipeline function; no hook/React needed
import { organize_views } from '../src/table-view-controller/use-organized-views.js'
import { fuzzy_match } from '#src/utils/fuzzy-match.js'

// ── helpers ───────────────────────────────────────────────────────────────────
let _id_counter = 0
const make_view = (overrides = {}) => ({
  view_id: `view-${++_id_counter}`,
  view_name: 'Test View',
  view_username: 'alice',
  view_description: '',
  ...overrides
})

// ── Sectioning ────────────────────────────────────────────────────────────────
describe('organize_views — sectioning', () => {
  it('puts views owned by table_username into mine', () => {
    const view = make_view({ view_username: 'alice' })
    const { counts } = organize_views({
      views: [view],
      table_username: 'alice'
    })
    expect(counts.mine).to.equal(1)
  })

  it('puts other users views into shared', () => {
    const view = make_view({ view_username: 'bob' })
    const { counts } = organize_views({
      views: [view],
      table_username: 'alice'
    })
    expect(counts.shared).to.equal(1)
    expect(counts.mine).to.equal(0)
  })

  it('puts system views into system section', () => {
    const view = make_view({ view_username: 'system' })
    const { counts } = organize_views({
      views: [view],
      table_username: 'alice'
    })
    expect(counts.system).to.equal(1)
  })

  it('puts favorited views into favorites count', () => {
    const view = make_view({ view_username: 'bob' })
    const fav = new Set([view.view_id])
    const { counts } = organize_views({
      views: [view],
      table_username: 'alice',
      favorite_view_ids: fav
    })
    expect(counts.favorites).to.equal(1)
  })

  it('a favorited own view increments both mine and favorites', () => {
    const view = make_view({ view_username: 'alice' })
    const fav = new Set([view.view_id])
    const { counts } = organize_views({
      views: [view],
      table_username: 'alice',
      favorite_view_ids: fav
    })
    expect(counts.mine).to.equal(1)
    expect(counts.favorites).to.equal(1)
  })

  it('handles no organization props — all views in shared', () => {
    const views = [make_view(), make_view()]
    const { counts } = organize_views({ views })
    expect(counts.shared).to.equal(2)
  })
})

// ── Fuzzy filter ──────────────────────────────────────────────────────────────
describe('organize_views — fuzzy filter', () => {
  it('filters views by name via filter_text', () => {
    const views = [
      make_view({ view_name: 'QB Passing Stats' }),
      make_view({ view_name: 'RB Rushing Stats' })
    ]
    const { filtered } = organize_views({ views, filter_text: 'QB' })
    expect(filtered.length).to.equal(1)
    expect(filtered[0].view_name).to.equal('QB Passing Stats')
  })

  it('matches filter_text against description', () => {
    const views = [
      make_view({ view_name: 'Stats', view_description: 'betting lines' }),
      make_view({ view_name: 'Other', view_description: 'rushing yards' })
    ]
    const { filtered } = organize_views({ views, filter_text: 'betting' })
    expect(filtered.length).to.equal(1)
  })

  it('returns all views when filter_text is empty', () => {
    const views = [make_view({ view_name: 'A' }), make_view({ view_name: 'B' })]
    const { filtered } = organize_views({ views, filter_text: '' })
    expect(filtered.length).to.equal(2)
  })

  it('matches filter_text against username', () => {
    const views = [
      make_view({ view_username: 'trashman', view_name: 'X' }),
      make_view({ view_username: 'alice', view_name: 'Y' })
    ]
    const { filtered } = organize_views({ views, filter_text: 'trash' })
    expect(filtered.length).to.equal(1)
    expect(filtered[0].view_username).to.equal('trashman')
  })
})

// ── Tag filter ────────────────────────────────────────────────────────────────
describe('organize_views — tag filter', () => {
  it('filters views to only those matching the active tag filter', () => {
    const view_a = make_view({ view_name: 'Alpha' })
    const view_b = make_view({ view_name: 'Beta' })
    const tags_map = new Map([
      [view_a.view_id, [{ name: 'qb', source: 'auto' }]],
      [view_b.view_id, [{ name: 'rb', source: 'user' }]]
    ])
    const { filtered } = organize_views({
      views: [view_a, view_b],
      tags_by_view_id: tags_map,
      active_tag_filters: new Set(['qb'])
    })
    expect(filtered.length).to.equal(1)
    expect(filtered[0].view_id).to.equal(view_a.view_id)
  })

  it('AND-combines multiple active tag filters', () => {
    const view_a = make_view({ view_name: 'Alpha' })
    const view_b = make_view({ view_name: 'Beta' })
    const tags_map = new Map([
      [
        view_a.view_id,
        [
          { name: 'qb', source: 'auto' },
          { name: 'current-week', source: 'auto' }
        ]
      ],
      [view_b.view_id, [{ name: 'qb', source: 'auto' }]]
    ])
    const { filtered } = organize_views({
      views: [view_a, view_b],
      tags_by_view_id: tags_map,
      active_tag_filters: new Set(['qb', 'current-week'])
    })
    expect(filtered.length).to.equal(1)
    expect(filtered[0].view_id).to.equal(view_a.view_id)
  })

  it('returns all views when active_tag_filters is empty', () => {
    const views = [make_view(), make_view()]
    const { filtered } = organize_views({
      views,
      active_tag_filters: new Set()
    })
    expect(filtered.length).to.equal(2)
  })
})

// ── Auto-tags pass-through ────────────────────────────────────────────────────
describe('organize_views — auto_tags_map integration', () => {
  it('includes auto tags from auto_tags_map in tag filtering', () => {
    const view = make_view({ view_name: 'Alpha' })
    const auto_map = new Map([[view.view_id, ['player-stats', 'qb']]])
    const { filtered } = organize_views({
      views: [view],
      auto_tags_map: auto_map,
      active_tag_filters: new Set(['qb'])
    })
    expect(filtered.length).to.equal(1)
  })

  it('attaches auto tags to view.tags in result', () => {
    const view = make_view()
    const auto_map = new Map([[view.view_id, ['efficiency']]])
    const { filtered } = organize_views({
      views: [view],
      auto_tags_map: auto_map
    })
    const result_view = filtered.find((v) => v.view_id === view.view_id)
    expect(
      result_view.tags.some(
        (t) => t.name === 'efficiency' && t.source === 'auto'
      )
    ).to.equal(true)
  })
})

// ── Section filter ────────────────────────────────────────────────────────────
describe('organize_views — active_section filter', () => {
  it('returns only mine views when active_section is mine', () => {
    const mine = make_view({ view_username: 'alice' })
    const shared = make_view({ view_username: 'bob' })
    const { sections } = organize_views({
      views: [mine, shared],
      table_username: 'alice',
      active_section: 'mine'
    })
    expect(sections.mine.length).to.equal(1)
    expect(sections.mine[0].view_id).to.equal(mine.view_id)
  })

  it('favorites section returns only favorited views', () => {
    const fav_view = make_view({ view_username: 'bob' })
    const other = make_view({ view_username: 'charlie' })
    const { sections } = organize_views({
      views: [fav_view, other],
      table_username: 'alice',
      favorite_view_ids: new Set([fav_view.view_id]),
      active_section: 'favorites'
    })
    expect(sections.favorites.length).to.equal(1)
    expect(sections.favorites[0].view_id).to.equal(fav_view.view_id)
  })
})

// ── Idempotency / stability ───────────────────────────────────────────────────
describe('organize_views — stability', () => {
  it('returns same shape for empty views', () => {
    const result = organize_views({ views: [] })
    expect(result).to.have.keys(['sections', 'counts', 'filtered'])
    expect(result.filtered).to.deep.equal([])
  })

  it('produces deterministic output for the same input', () => {
    const views = [
      make_view({ view_name: 'QB Stats', view_username: 'alice' }),
      make_view({ view_name: 'RB Stats', view_username: 'bob' })
    ]
    const params = { views, table_username: 'alice', filter_text: '' }
    const r1 = organize_views(params)
    const r2 = organize_views(params)
    expect(r1.counts).to.deep.equal(r2.counts)
    expect(r1.filtered.map((v) => v.view_id)).to.deep.equal(
      r2.filtered.map((v) => v.view_id)
    )
  })
})

// Smoke test fuzzy_match import (ensures the util is accessible from tests)
describe('fuzzy_match — module accessibility', () => {
  it('can be imported and called from test context', () => {
    expect(fuzzy_match('qb', 'QB Stats 2024')).to.equal(true)
  })
})
