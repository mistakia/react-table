import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  DEFAULT_BAR_CHART_ROW_LIMIT,
  select_rank_window,
  build_scope_text,
  derive_bar_chart_data,
  compute_average
} from '../../src/bar-chart-overlay/bar-chart-data.js'
import { build_bar_chart_options } from '../../src/bar-chart-overlay/bar-chart-options.js'

// A player-grain result: the shape that made this chart unusable. 500 rows,
// one bar each, and the whole reason a window exists.
const many_rows = Array.from({ length: 500 }, (_, index) => ({
  name: `row-${String(index + 1).padStart(3, '0')}`,
  value: index + 1
}))

// A team-grain result. 32 subjects reads exactly like the reference and is the
// case a row cap must not touch.
const team_rows = Array.from({ length: 32 }, (_, index) => ({
  name: `team-${index}`,
  value: index - 15
}))

const label_of = (row) => row.name

const derive = (overrides = {}) =>
  derive_bar_chart_data({
    data: many_rows,
    accessor_path: 'value',
    get_label: label_of,
    ...overrides
  })

describe('bar chart row window', () => {
  describe('select_rank_window', () => {
    const ranked = [1, 2, 3, 4, 5].map((value) => ({ value }))

    it('keeps the tail of the ascending ranking for the top window', () => {
      const window = select_rank_window({ rows: ranked, row_limit: 2 })
      expect(window.map((row) => row.value)).to.deep.equal([4, 5])
    })

    it('keeps the head for the bottom window', () => {
      const window = select_rank_window({
        rows: ranked,
        row_limit: 2,
        rank_window: 'bottom'
      })
      expect(window.map((row) => row.value)).to.deep.equal([1, 2])
    })

    it('returns every row when the set is smaller than the limit', () => {
      expect(
        select_rank_window({ rows: ranked, row_limit: 50 })
      ).to.have.length(5)
    })

    it('falls back to the default limit for a missing or unusable value', () => {
      for (const row_limit of [null, undefined, 0, -5, 2.5, '10']) {
        expect(
          select_rank_window({ rows: many_rows, row_limit })
        ).to.have.length(DEFAULT_BAR_CHART_ROW_LIMIT)
      }
    })
  })

  // The default exists to fix a 500-row player chart, and the 32-team chart is
  // the one case already known to be correct. A cap that clipped it would
  // regress the only verified rendering this component has.
  it('leaves a full team-grain set untouched under the default limit', () => {
    const derived = derive_bar_chart_data({
      data: team_rows,
      accessor_path: 'value',
      get_label: label_of
    })
    expect(derived.rows).to.have.length(32)
    expect(derived.is_truncated).to.equal(false)
    expect(derived.scope_text).to.equal(null)
  })

  describe('build_scope_text', () => {
    it('says nothing when nothing was dropped', () => {
      expect(build_scope_text({ drawn_count: 32, total_count: 32 })).to.equal(
        null
      )
    })

    it('names the end, the drawn count and the total', () => {
      expect(build_scope_text({ drawn_count: 40, total_count: 500 })).to.equal(
        'Top 40 of 500 rows'
      )
      expect(
        build_scope_text({
          drawn_count: 40,
          total_count: 500,
          rank_window: 'bottom'
        })
      ).to.equal('Bottom 40 of 500 rows')
    })
  })

  describe('derive_bar_chart_data', () => {
    it('draws the default number of bars and reports the full total', () => {
      const derived = derive()
      expect(derived.rows).to.have.length(DEFAULT_BAR_CHART_ROW_LIMIT)
      expect(derived.categories).to.have.length(DEFAULT_BAR_CHART_ROW_LIMIT)
      expect(derived.bar_points).to.have.length(DEFAULT_BAR_CHART_ROW_LIMIT)
      expect(derived.total_row_count).to.equal(500)
      expect(derived.is_truncated).to.equal(true)
      expect(derived.scope_text).to.equal('Top 40 of 500 rows')
    })

    // The line says "Average". Computing it over the window would make it the
    // average of the 40 best, which every reader would take for the average of
    // the 500. The control is the window's own average -- the two must differ.
    it('averages every matching row, not the drawn window', () => {
      const derived = derive()
      const window_average = compute_average(derived.values)
      expect(derived.average).to.equal(250.5)
      expect(window_average).to.equal(480.5)
      expect(derived.average).to.not.equal(window_average)
    })

    it('forces the average into the value axis on a truncated chart', () => {
      const bottom = derive({ rank_window: 'bottom' })
      expect(bottom.average).to.equal(250.5)
      expect(bottom.axis_extremes.max).to.be.at.least(250.5)
    })

    it('leaves the axis fitted to the bars when the average line is off', () => {
      const bottom = derive({
        rank_window: 'bottom',
        include_average_in_extremes: false
      })
      expect(bottom.axis_extremes.max).to.be.below(250.5)
    })

    it('honours an explicit limit over the default', () => {
      const derived = derive({ row_limit: 5 })
      expect(derived.rows.map((row) => row.value)).to.deep.equal([
        496, 497, 498, 499, 500
      ])
      expect(derived.scope_text).to.equal('Top 5 of 500 rows')
    })
  })

  describe('build_bar_chart_options', () => {
    const build = (bar_chart_options = {}) =>
      build_bar_chart_options({
        data: many_rows,
        accessor_path: 'value',
        get_label: label_of,
        bar_chart_options
      })

    it('states the scope in the subtitle', () => {
      expect(build().subtitle.text).to.equal('Top 40 of 500 rows')
    })

    it('appends the scope to a consumer subtitle rather than replacing it', () => {
      expect(build({ custom_subtitle: 'Since 2023' }).subtitle.text).to.equal(
        'Since 2023 — Top 40 of 500 rows'
      )
    })

    // No option removes it. The nearest thing to a suppression switch is a
    // limit above the row count, which is not a suppression -- it is the chart
    // no longer being truncated.
    it('drops the clause only when the chart is no longer truncated', () => {
      const uncapped = build({ row_limit: 500 })
      expect(uncapped.subtitle).to.equal(undefined)
      expect(uncapped.custom.is_truncated).to.equal(false)
      expect(uncapped.custom.row_count).to.equal(500)
    })

    it('carries the window onto custom for the component and its callers', () => {
      const bottom = build({ rank_window: 'bottom', row_limit: 10 })
      expect(bottom.custom.rank_window).to.equal('bottom')
      expect(bottom.custom.total_row_count).to.equal(500)
      expect(bottom.custom.scope_text).to.equal('Bottom 10 of 500 rows')
      expect(bottom.series[0].data.map((point) => point.y)).to.deep.equal([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10
      ])
    })
  })
})
