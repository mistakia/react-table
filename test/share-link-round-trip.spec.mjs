import { describe, it } from 'mocha'
import { expect } from 'chai'

import { SHARE_LINK_URL_SCHEMA } from '#src/constants.mjs'
import { parse_url_params_to_table_state } from '#src/utils/parse-url-params-to-table-state.mjs'

// Mirrors the writer iteration in
// `src/table-menu/table-menu.js::handle_shareable_link`. Kept in lockstep with
// the writer; if these diverge, the round-trip spec catches it.
const serialize = ({ table_state, view_fields }) => {
  const params = new URLSearchParams()
  for (const [key, type] of Object.entries(SHARE_LINK_URL_SCHEMA.table_state)) {
    const value = table_state?.[key]
    if (type === 'array') {
      if (Array.isArray(value) && value.length > 0) {
        params.append(key, JSON.stringify(value))
      }
    } else if (type === 'object') {
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        params.append(key, JSON.stringify(value))
      }
    } else if (type === 'string') {
      if (value) params.append(key, value)
    } else if (type === 'boolean') {
      params.append(key, String(Boolean(value)))
    }
  }
  for (const key of SHARE_LINK_URL_SCHEMA.view) {
    const value = view_fields?.[key]
    if (value) params.append(key, value)
  }
  return params
}

describe('share-link round trip', () => {
  it('round-trips a fully populated table_state through serialize + parse', () => {
    const table_state = {
      columns: ['a', { column_id: 'b', params: { week: [1, 2] } }],
      prefix_columns: ['p'],
      sort: [{ column_id: 'a', desc: true }],
      where: [{ column_id: 'a', operator: '=', value: 1 }],
      splits: ['year'],
      q: 'mahomes',
      rank_aggregation: { weights: { a: 1.0 } },
      scatter_plot_options: { x: 'a', y: 'b' },
      disable_scatter_plot: true
    }
    const view_fields = {
      view_id: 'abc',
      view_name: 'My View',
      view_description: 'desc',
      view_search_column_id: 'col1'
    }

    const params = serialize({ table_state, view_fields })
    const parsed = parse_url_params_to_table_state(params)

    expect(parsed.table_state).to.deep.equal(table_state)
    expect(parsed.view_fields).to.deep.equal(view_fields)
  })

  it('omits empty-shape array/object/string from the URL but always emits boolean', () => {
    const params = serialize({
      table_state: {
        columns: [],
        prefix_columns: [],
        sort: [],
        where: [],
        splits: [],
        q: '',
        rank_aggregation: {},
        scatter_plot_options: {},
        disable_scatter_plot: false
      },
      view_fields: {}
    })
    expect(params.has('columns')).to.equal(false)
    expect(params.has('prefix_columns')).to.equal(false)
    expect(params.has('sort')).to.equal(false)
    expect(params.has('where')).to.equal(false)
    expect(params.has('splits')).to.equal(false)
    expect(params.has('q')).to.equal(false)
    expect(params.has('rank_aggregation')).to.equal(false)
    expect(params.has('scatter_plot_options')).to.equal(false)
    expect(params.get('disable_scatter_plot')).to.equal('false')
  })

  it('parses empty URLSearchParams into empty-shape table_state and empty-string view_fields', () => {
    const parsed = parse_url_params_to_table_state(new URLSearchParams())
    expect(parsed.table_state).to.deep.equal({
      columns: [],
      prefix_columns: [],
      sort: [],
      where: [],
      splits: [],
      q: '',
      rank_aggregation: {},
      scatter_plot_options: {},
      disable_scatter_plot: false
    })
    expect(parsed.view_fields).to.deep.equal({
      view_id: '',
      view_name: '',
      view_description: '',
      view_search_column_id: ''
    })
  })

  it('falls back to empty-shape default when an array/object param contains malformed JSON', () => {
    const params = new URLSearchParams()
    params.append('columns', '{not-json')
    params.append('rank_aggregation', '[also bad')
    const parsed = parse_url_params_to_table_state(params)
    expect(parsed.table_state.columns).to.deep.equal([])
    expect(parsed.table_state.rank_aggregation).to.deep.equal({})
  })

  it('treats absent boolean as false and "true" as true', () => {
    const parsed_absent = parse_url_params_to_table_state(new URLSearchParams())
    expect(parsed_absent.table_state.disable_scatter_plot).to.equal(false)

    const params = new URLSearchParams()
    params.append('disable_scatter_plot', 'true')
    expect(
      parse_url_params_to_table_state(params).table_state.disable_scatter_plot
    ).to.equal(true)

    const params_false = new URLSearchParams()
    params_false.append('disable_scatter_plot', 'false')
    expect(
      parse_url_params_to_table_state(params_false).table_state
        .disable_scatter_plot
    ).to.equal(false)
  })

  it('round-trips disable_scatter_plot=true even when the rest is empty', () => {
    const params = serialize({
      table_state: {
        columns: [],
        prefix_columns: [],
        sort: [],
        where: [],
        splits: [],
        q: '',
        rank_aggregation: {},
        scatter_plot_options: {},
        disable_scatter_plot: true
      },
      view_fields: {}
    })
    const parsed = parse_url_params_to_table_state(params)
    expect(parsed.table_state.disable_scatter_plot).to.equal(true)
  })
})
