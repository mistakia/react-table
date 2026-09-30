import { describe, it } from 'mocha'
import { expect } from 'chai'

import { derive_bar_tiers } from '../../src/bar-chart-overlay/bar-chart-data.js'
import {
  build_bar_chart_options,
  TIER_BAND_COLOR
} from '../../src/bar-chart-overlay/bar-chart-options.js'

// Three separated groups, ascending as the chart sorts them.
const values = [100, 104, 108, 180, 184, 260, 262, 266]

describe('derive_bar_tiers', () => {
  it('forms contiguous runs with Tier 1 at the highest values', () => {
    expect(derive_bar_tiers({ values, tier_count: 3 })).to.deep.equal([
      { tier_number: 3, start_index: 0, end_index: 2 },
      { tier_number: 2, start_index: 3, end_index: 4 },
      { tier_number: 1, start_index: 5, end_index: 7 }
    ])
  })

  it('draws fewer tiers than asked when the bars hold fewer distinct values', () => {
    const tiers = derive_bar_tiers({ values: [5, 5, 9, 9], tier_count: 5 })
    expect(tiers.map((tier) => tier.tier_number)).to.deep.equal([2, 1])
  })

  it('returns null when the bars cannot form two tiers', () => {
    expect(derive_bar_tiers({ values: [7, 7, 7], tier_count: 3 })).to.equal(
      null
    )
    expect(derive_bar_tiers({ values: [], tier_count: 3 })).to.equal(null)
  })
})

const data = values.map((value, index) => ({ subject: `S${index}`, value }))

const build = (bar_chart_options) =>
  build_bar_chart_options({
    data,
    accessor_path: 'value',
    get_label: (row) => row.subject,
    bar_chart_options
  })

describe('bar chart tier bands', () => {
  it('draws no bands unless tiers are switched on', () => {
    expect(build({}).xAxis.plotBands).to.deep.equal([])
    expect(build({ tier_count: 3 }).xAxis.plotBands).to.deep.equal([])
  })

  it('bands each tier across its categories, shading alternate tiers', () => {
    const bands = build({ show_tiers: true, tier_count: 3 }).xAxis.plotBands
    expect(
      bands.map(({ from, to, label }) => [from, to, label.text])
    ).to.deep.equal([
      [-0.5, 2.5, 'Tier 3'],
      [2.5, 4.5, 'Tier 2'],
      [4.5, 7.5, 'Tier 1']
    ])
    expect(bands.map((band) => band.color)).to.deep.equal([
      TIER_BAND_COLOR,
      'transparent',
      TIER_BAND_COLOR
    ])
  })

  it('defaults to five tiers', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      subject: `S${index}`,
      value: index * index
    }))
    const built = build_bar_chart_options({
      data: many,
      accessor_path: 'value',
      get_label: (row) => row.subject,
      bar_chart_options: { show_tiers: true }
    })
    expect(built.custom.tiers).to.have.lengthOf(5)
  })

  it('tiers the drawn window, not every matched row', () => {
    const many = Array.from({ length: 100 }, (_, index) => ({
      subject: `S${index}`,
      value: index
    }))
    const built = build_bar_chart_options({
      data: many,
      accessor_path: 'value',
      get_label: (row) => row.subject,
      bar_chart_options: { show_tiers: true, tier_count: 4, row_limit: 20 }
    })
    const last = built.custom.tiers.at(-1)
    expect(last.end_index).to.equal(19)
    expect(built.custom.tiers.map((tier) => tier.tier_number)).to.deep.equal([
      4, 3, 2, 1
    ])
  })
})
