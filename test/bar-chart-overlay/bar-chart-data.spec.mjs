import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  derive_bar_chart_data,
  compute_axis_extremes,
  resolve_value_decimals,
  filter_bar_rows,
  sort_bar_rows,
  compute_average
} from '../../src/bar-chart-overlay/bar-chart-data.js'

// Values lifted from the reference chart (team EPA per play, 2023-2025), which
// is the shape this chart type is for: small magnitudes, roughly half of them
// negative, a meaningful zero.
const epa_rows = [
  { team: 'CLV', epa: -0.21 },
  { team: 'NYJ', epa: -0.141 },
  { team: 'TEN', epa: -0.112 },
  { team: 'PIT', epa: -0.007 },
  { team: 'CHI', epa: 0.001 },
  { team: 'DAL', epa: 0.082 },
  { team: 'BUF', epa: 0.217 }
]

const label_of = (row) => row.team

describe('bar-chart-data', () => {
  describe('filter_bar_rows', () => {
    it('drops null, undefined and non-finite values', () => {
      const rows = filter_bar_rows({
        data: [
          { v: 1 },
          { v: null },
          { v: undefined },
          { v: NaN },
          { v: Infinity },
          { v: 'not a number' },
          { v: 2 }
        ],
        accessor_path: 'v'
      })
      expect(rows.map((row) => row.v)).to.deep.equal([1, 2])
    })

    // The scatter plot drops zeros; this chart must not. A zero is a rank.
    it('keeps zero', () => {
      const rows = filter_bar_rows({
        data: [{ v: 0 }, { v: 5 }],
        accessor_path: 'v'
      })
      expect(rows).to.have.length(2)
    })

    it('keeps negative values', () => {
      const rows = filter_bar_rows({
        data: [{ v: -3 }, { v: 4 }],
        accessor_path: 'v'
      })
      expect(rows).to.have.length(2)
    })

    it('returns an empty array for absent data', () => {
      expect(filter_bar_rows({ data: null, accessor_path: 'v' })).to.deep.equal(
        []
      )
    })
  })

  describe('sort_bar_rows', () => {
    it('sorts ascending, so the chart reads worst to best left to right', () => {
      const rows = sort_bar_rows({
        rows: [
          { v: 3, t: 'C' },
          { v: 1, t: 'A' },
          { v: 2, t: 'B' }
        ],
        accessor_path: 'v',
        get_label: (row) => row.t
      })
      expect(rows.map((row) => row.t)).to.deep.equal(['A', 'B', 'C'])
    })

    it('orders negatives before positives', () => {
      const rows = sort_bar_rows({
        rows: [
          { v: 1, t: 'up' },
          { v: -1, t: 'down' },
          { v: 0, t: 'flat' }
        ],
        accessor_path: 'v',
        get_label: (row) => row.t
      })
      expect(rows.map((row) => row.t)).to.deep.equal(['down', 'flat', 'up'])
    })

    it('breaks ties on label so the order is stable across renders', () => {
      const rows = sort_bar_rows({
        rows: [
          { v: 1, t: 'ZZ' },
          { v: 1, t: 'AA' },
          { v: 1, t: 'MM' }
        ],
        accessor_path: 'v',
        get_label: (row) => row.t
      })
      expect(rows.map((row) => row.t)).to.deep.equal(['AA', 'MM', 'ZZ'])
    })

    it('does not mutate the input array', () => {
      const input = [{ v: 2 }, { v: 1 }]
      sort_bar_rows({ rows: input, accessor_path: 'v', get_label: () => '' })
      expect(input.map((row) => row.v)).to.deep.equal([2, 1])
    })
  })

  describe('compute_average', () => {
    it('returns null on no values rather than NaN', () => {
      expect(compute_average([])).to.equal(null)
    })

    it('averages across the sign', () => {
      expect(compute_average([-2, 2])).to.equal(0)
    })
  })

  describe('resolve_value_decimals', () => {
    it('gives sub-unit data three places, so EPA does not round to 0.0', () => {
      expect(
        resolve_value_decimals({ values: [-0.21, 0.001, 0.217] })
      ).to.equal(3)
    })

    it('gives single-digit data two places', () => {
      expect(resolve_value_decimals({ values: [1.5, -8.25] })).to.equal(2)
    })

    it('gives four-digit data none', () => {
      expect(resolve_value_decimals({ values: [1200, 1450] })).to.equal(0)
    })

    it('is driven by the largest magnitude, not per bar', () => {
      // One big value present means every bar in the chart formats alike.
      expect(resolve_value_decimals({ values: [0.001, 5000] })).to.equal(0)
    })

    it('honors an explicit override, including zero', () => {
      expect(resolve_value_decimals({ values: [0.001], override: 0 })).to.equal(
        0
      )
      expect(resolve_value_decimals({ values: [0.001], override: 4 })).to.equal(
        4
      )
    })

    it('ignores a nonsense override', () => {
      expect(resolve_value_decimals({ values: [0.5], override: -1 })).to.equal(
        3
      )
      expect(
        resolve_value_decimals({ values: [0.5], override: 'two' })
      ).to.equal(3)
    })

    it('returns a default on no values instead of -Infinity', () => {
      expect(resolve_value_decimals({ values: [] })).to.equal(2)
    })
  })

  describe('compute_axis_extremes', () => {
    it('pins the baseline at zero for all-positive data', () => {
      const { min, max } = compute_axis_extremes({ values: [10, 20, 30] })
      expect(min).to.equal(0)
      expect(max).to.be.greaterThan(30)
    })

    it('pins the baseline at zero for all-negative data', () => {
      const { min, max } = compute_axis_extremes({ values: [-10, -20, -30] })
      expect(max).to.equal(0)
      expect(min).to.be.lessThan(-30)
    })

    it('spans both signs when the data does, keeping zero interior', () => {
      const { min, max } = compute_axis_extremes({ values: [-5, 5] })
      expect(min).to.be.lessThan(0)
      expect(max).to.be.greaterThan(0)
    })

    it('leaves headroom past the extremes for the value labels', () => {
      const { max } = compute_axis_extremes({ values: [0, 100] })
      expect(max).to.be.greaterThan(100)
    })

    it('returns a unit window rather than a zero-height axis on all zeros', () => {
      expect(compute_axis_extremes({ values: [0, 0, 0] })).to.deep.equal({
        min: -1,
        max: 1
      })
    })

    it('returns nulls on no values', () => {
      expect(compute_axis_extremes({ values: [] })).to.deep.equal({
        min: null,
        max: null
      })
    })
  })

  describe('derive_bar_chart_data', () => {
    describe('with mixed-sign data', () => {
      const derived = derive_bar_chart_data({
        data: epa_rows,
        accessor_path: 'epa',
        get_label: label_of,
        get_color: (row) => (row.team === 'BUF' ? '#00338d' : null)
      })

      it('ranks every row ascending', () => {
        expect(derived.categories).to.deep.equal([
          'CLV',
          'NYJ',
          'TEN',
          'PIT',
          'CHI',
          'DAL',
          'BUF'
        ])
      })

      it('reports that negatives are present', () => {
        expect(derived.has_negative_values).to.equal(true)
      })

      it('keeps the zero baseline inside the axis', () => {
        expect(derived.axis_extremes.min).to.be.lessThan(0)
        expect(derived.axis_extremes.max).to.be.greaterThan(0)
      })

      it('carries the average across the sign', () => {
        const expected =
          epa_rows.reduce((sum, row) => sum + row.epa, 0) / epa_rows.length
        expect(derived.average).to.be.closeTo(expected, 1e-12)
      })

      it('colors only the rows the resolver answered for', () => {
        const buf = derived.bar_points.find((point) => point.label === 'BUF')
        const clv = derived.bar_points.find((point) => point.label === 'CLV')
        expect(buf.color).to.equal('#00338d')
        expect(clv).to.not.have.property('color')
      })

      it('carries the source row on each point for the tooltip', () => {
        expect(derived.bar_points[0].original_data).to.equal(epa_rows[0])
      })

      it('is not empty', () => {
        expect(derived.is_empty).to.equal(false)
      })
    })

    describe('with a single row', () => {
      const derived = derive_bar_chart_data({
        data: [{ team: 'BUF', epa: 0.217 }],
        accessor_path: 'epa',
        get_label: label_of
      })

      it('renders one bar', () => {
        expect(derived.bar_points).to.have.length(1)
        expect(derived.categories).to.deep.equal(['BUF'])
      })

      it('puts the average on that row rather than returning NaN', () => {
        expect(derived.average).to.equal(0.217)
      })

      it('still pins the baseline at zero, so the lone bar is not full height', () => {
        expect(derived.axis_extremes.min).to.equal(0)
        expect(derived.axis_extremes.max).to.be.greaterThan(0.217)
      })

      it('is not empty', () => {
        expect(derived.is_empty).to.equal(false)
      })
    })

    describe('with a single negative row', () => {
      const derived = derive_bar_chart_data({
        data: [{ team: 'CLV', epa: -0.21 }],
        accessor_path: 'epa',
        get_label: label_of
      })

      it('hangs the bar below a zero ceiling', () => {
        expect(derived.axis_extremes.max).to.equal(0)
        expect(derived.axis_extremes.min).to.be.lessThan(-0.21)
      })

      it('reports the negative', () => {
        expect(derived.has_negative_values).to.equal(true)
      })
    })

    describe('with an empty result', () => {
      const derived = derive_bar_chart_data({
        data: [],
        accessor_path: 'epa',
        get_label: label_of
      })

      it('is flagged empty so the component can say so', () => {
        expect(derived.is_empty).to.equal(true)
      })

      it('produces no bars, no categories and no logos', () => {
        expect(derived.bar_points).to.deep.equal([])
        expect(derived.categories).to.deep.equal([])
        expect(derived.logo_points).to.deep.equal([])
      })

      it('returns a null average rather than NaN', () => {
        expect(derived.average).to.equal(null)
      })

      it('does not claim negatives', () => {
        expect(derived.has_negative_values).to.equal(false)
      })
    })

    describe('when every row is filtered out', () => {
      const derived = derive_bar_chart_data({
        data: [
          { team: 'A', epa: null },
          { team: 'B', epa: undefined }
        ],
        accessor_path: 'epa',
        get_label: label_of
      })

      it('is empty, not a chart of two blank bars', () => {
        expect(derived.is_empty).to.equal(true)
        expect(derived.categories).to.deep.equal([])
      })
    })

    describe('logo points', () => {
      const derived = derive_bar_chart_data({
        data: epa_rows,
        accessor_path: 'epa',
        get_label: label_of,
        get_image: ({ row }) =>
          row.team === 'PIT'
            ? null
            : { url: `https://logos.example/${row.team}.png` },
        logo_size: 30
      })

      it('places each logo at its bar index and value', () => {
        const buf = derived.logo_points.find((point) =>
          point.marker.symbol.includes('BUF')
        )
        expect(buf.x).to.equal(derived.categories.indexOf('BUF'))
        expect(buf.y).to.equal(0.217)
      })

      it('rides the value end of a negative bar too', () => {
        const clv = derived.logo_points.find((point) =>
          point.marker.symbol.includes('CLV')
        )
        expect(clv.y).to.equal(-0.21)
      })

      it('skips a row the resolver has no image for', () => {
        expect(derived.logo_points).to.have.length(epa_rows.length - 1)
        expect(
          derived.logo_points.some((point) =>
            point.marker.symbol.includes('PIT')
          )
        ).to.equal(false)
      })

      it('falls back to the requested logo size when the resolver omits one', () => {
        expect(derived.logo_points[0].marker.width).to.equal(30)
        expect(derived.logo_points[0].marker.height).to.equal(30)
      })

      it('produces nothing when no resolver is supplied', () => {
        const no_logos = derive_bar_chart_data({
          data: epa_rows,
          accessor_path: 'epa',
          get_label: label_of
        })
        expect(no_logos.logo_points).to.deep.equal([])
      })
    })
  })
})
