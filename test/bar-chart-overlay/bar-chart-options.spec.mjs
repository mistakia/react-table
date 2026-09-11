import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  build_bar_chart_options,
  AVERAGE_LINE_COLOR,
  BAR_LOGO_SIZE
} from '../../src/bar-chart-overlay/bar-chart-options.js'

const epa_rows = [
  { team: 'CLV', epa: -0.21 },
  { team: 'NYJ', epa: -0.141 },
  { team: 'CHI', epa: 0.001 },
  { team: 'DAL', epa: 0.082 },
  { team: 'BUF', epa: 0.217 }
]

const base_args = {
  data: epa_rows,
  accessor_path: 'epa',
  column: { header_label: 'EPA per play' },
  get_label: (row) => row.team
}

const bar_series_of = (options) =>
  options.series.find((series) => series.id === 'bar-chart-bars')
const logo_series_of = (options) =>
  options.series.find((series) => series.id === 'bar-chart-logos')

describe('build_bar_chart_options', () => {
  describe('with mixed-sign data', () => {
    const options = build_bar_chart_options(base_args)

    it('renders a column chart by default', () => {
      expect(options.chart.type).to.equal('column')
      expect(bar_series_of(options).type).to.equal('column')
    })

    it('titles the value axis from the column label', () => {
      expect(options.yAxis.title.text).to.equal('EPA per play')
    })

    it('puts the subjects on the category axis in rank order', () => {
      expect(options.xAxis.categories).to.deep.equal([
        'CLV',
        'NYJ',
        'CHI',
        'DAL',
        'BUF'
      ])
    })

    it('labels every subject rather than thinning them', () => {
      expect(options.xAxis.labels.step).to.equal(1)
    })

    it('draws a dashed average line labelled Average', () => {
      const average_line = options.yAxis.plotLines.find(
        (line) => line.label?.text === 'Average'
      )
      expect(average_line.dashStyle).to.equal('Dash')
      expect(average_line.color).to.equal(AVERAGE_LINE_COLOR)
      expect(average_line.value).to.be.closeTo(-0.0102, 1e-4)
    })

    it('draws an explicit zero baseline, since the axis line is not at zero', () => {
      const zero_line = options.yAxis.plotLines.find(
        (line) => line.value === 0 && !line.label
      )
      expect(zero_line).to.exist
    })

    it('holds the zero baseline inside the axis range', () => {
      expect(options.yAxis.min).to.be.lessThan(0)
      expect(options.yAxis.max).to.be.greaterThan(0)
    })

    it('turns off tick snapping, so the padded extremes survive', () => {
      expect(options.yAxis.startOnTick).to.equal(false)
      expect(options.yAxis.endOnTick).to.equal(false)
    })

    it('suppresses the legend, which would name a single series', () => {
      expect(options.legend.enabled).to.equal(false)
    })

    it('reports a non-empty chart', () => {
      expect(options.custom.is_empty).to.equal(false)
      expect(options.custom.row_count).to.equal(5)
    })
  })

  describe('value labels', () => {
    const options = build_bar_chart_options(base_args)
    const labels = bar_series_of(options).dataLabels

    it('are enabled by default', () => {
      expect(labels.enabled).to.equal(true)
    })

    it('sit outside the bar, uncropped, so a full-height bar keeps its label', () => {
      expect(labels.inside).to.equal(false)
      expect(labels.crop).to.equal(false)
      expect(labels.overflow).to.equal('allow')
    })

    it('offset a positive bar label upward, clear of the logo on its end', () => {
      const buf = bar_series_of(options).data.find(
        (point) => point.label === 'BUF'
      )
      expect(buf.dataLabels.y).to.be.lessThan(0)
      expect(buf.dataLabels.verticalAlign).to.equal('bottom')
    })

    // The reference puts a negative bar's value BELOW it. A single series-level
    // `y` cannot do both signs: the offset that clears a positive bar's logo
    // drives a negative bar's label back down into its own bar, on top of the
    // logo already there.
    it('offset a negative bar label downward, outside the bar', () => {
      const clv = bar_series_of(options).data.find(
        (point) => point.label === 'CLV'
      )
      expect(clv.dataLabels.y).to.be.greaterThan(0)
      expect(clv.dataLabels.verticalAlign).to.equal('top')
    })

    it('places the two signs on opposite sides of the bar end', () => {
      const data = bar_series_of(options).data
      const positive = data.filter((point) => point.y > 0)
      const negative = data.filter((point) => point.y < 0)
      expect(positive.every((point) => point.dataLabels.y < 0)).to.equal(true)
      expect(negative.every((point) => point.dataLabels.y > 0)).to.equal(true)
    })

    it('keeps the formatter and crop rules on the series, not per point', () => {
      const data = bar_series_of(options).data
      expect(labels.formatter).to.be.a('function')
      expect(
        data.every((point) => !('formatter' in point.dataLabels))
      ).to.equal(true)
    })

    it('format at the precision the data has', () => {
      expect(labels.formatter.call({ y: 0.217 })).to.equal('0.217')
      expect(labels.formatter.call({ y: -0.21 })).to.equal('-0.210')
    })

    it('can be switched off', () => {
      const off = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { show_value_labels: false }
      })
      expect(bar_series_of(off).dataLabels.enabled).to.equal(false)
    })
  })

  describe('per-subject color', () => {
    const options = build_bar_chart_options({
      ...base_args,
      get_color: (row) => (row.team === 'BUF' ? '#00338d' : null)
    })

    it('colors the point the resolver answered for', () => {
      const buf = bar_series_of(options).data.find(
        (point) => point.label === 'BUF'
      )
      expect(buf.color).to.equal('#00338d')
    })

    it('leaves an unanswered point to the neutral series color', () => {
      const clv = bar_series_of(options).data.find(
        (point) => point.label === 'CLV'
      )
      expect(clv).to.not.have.property('color')
      expect(bar_series_of(options).color).to.be.a('string')
    })
  })

  describe('logo markers', () => {
    const options = build_bar_chart_options({
      ...base_args,
      get_image: ({ row }) => ({
        url: `https://logos.example/${row.team}.png`
      })
    })

    it('ride in their own scatter series above the bars', () => {
      const logos = logo_series_of(options)
      expect(logos.type).to.equal('scatter')
      expect(logos.zIndex).to.be.greaterThan(0)
      expect(logos.data).to.have.length(epa_rows.length)
    })

    it('do not capture the mouse or appear in the legend', () => {
      const logos = logo_series_of(options)
      expect(logos.enableMouseTracking).to.equal(false)
      expect(logos.showInLegend).to.equal(false)
    })

    it('carry an image symbol per point', () => {
      expect(logo_series_of(options).data[0].marker.symbol).to.match(
        /^url\(https:\/\/logos\.example\//
      )
    })

    it('are omitted entirely when no resolver is supplied', () => {
      expect(logo_series_of(build_bar_chart_options(base_args))).to.equal(
        undefined
      )
    })
  })

  describe('orientation', () => {
    it('switches to a horizontal bar chart on request', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { orientation: 'horizontal' }
      })
      expect(options.chart.type).to.equal('bar')
      expect(bar_series_of(options).type).to.equal('bar')
    })

    it('keeps the axis ROLES fixed when the orientation flips', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { orientation: 'horizontal' }
      })
      // xAxis stays the category axis and yAxis the value axis; Highcharts
      // swaps only which one is drawn horizontally.
      expect(options.xAxis.categories).to.have.length(5)
      expect(options.yAxis.title.text).to.equal('EPA per play')
    })

    it('offsets the value label along the bar, not above it, when horizontal', () => {
      const data = bar_series_of(
        build_bar_chart_options({
          ...base_args,
          bar_chart_options: { orientation: 'horizontal' }
        })
      ).data
      const positive = data.find((point) => point.y > 0)
      const negative = data.find((point) => point.y < 0)
      expect(positive.dataLabels.x).to.be.greaterThan(0)
      expect(positive.dataLabels.y).to.equal(0)
      // A leftward bar's label goes off its left end, not its right.
      expect(negative.dataLabels.x).to.be.lessThan(0)
      expect(negative.dataLabels.align).to.equal('right')
    })

    it('falls back to vertical on an unrecognized value', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { orientation: 'diagonal' }
      })
      expect(options.chart.type).to.equal('column')
    })

    // Highcharts rotates a plot-line label to 90 degrees when the line comes
    // out vertical, which an inverted chart makes it -- the label then reads
    // sideways down the top of the plot, over the longest bar. Pinned flat in
    // both orientations, and moved to the foot of the line when horizontal.
    it('keeps the average label flat and off the longest bar in both orientations', () => {
      const label_of = (orientation) =>
        build_bar_chart_options({
          ...base_args,
          bar_chart_options: { orientation }
        }).yAxis.plotLines.find((line) => line.label?.text === 'Average').label

      expect(label_of('vertical').rotation).to.equal(0)
      expect(label_of('horizontal').rotation).to.equal(0)
      // The end of the category axis with space on it is the top when the
      // bars run up, and the bottom when they run across.
      expect(label_of('vertical').verticalAlign).to.equal('top')
      expect(label_of('horizontal').verticalAlign).to.equal('bottom')
    })
  })

  describe('bar geometry', () => {
    const series = bar_series_of(build_bar_chart_options(base_args))

    // Highcharts 12 rounds a column by default, and the rounding lands on the
    // bar's value end -- the one place on the bar a reader takes a measurement
    // from, and the place the logo rides.
    it('draws square bar ends', () => {
      expect(series.borderRadius).to.equal(0)
    })

    it('caps bar width against the logo the cap exists to protect', () => {
      expect(series.maxPointWidth).to.equal(BAR_LOGO_SIZE * 3)
    })
  })

  describe('chrome', () => {
    const options = build_bar_chart_options(base_args)

    // Highcharts writes its own font stack inline, which no consumer
    // stylesheet can reach past.
    it('inherits the page font rather than imposing Highcharts default', () => {
      expect(options.chart.style.fontFamily).to.equal('inherit')
    })

    it('honours an explicit font family over inheritance', () => {
      const custom = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { font_family: 'IBM Plex Mono' }
      })
      expect(custom.chart.style.fontFamily).to.equal('IBM Plex Mono')
    })

    // The zero baseline and the average are the two horizontals that MEAN
    // something; a solid default grid at one rule per 72px competes with both.
    it('sets the value grid back to a sparse hairline', () => {
      expect(options.yAxis.gridLineDashStyle).to.equal('Dot')
      expect(options.yAxis.tickPixelInterval).to.be.greaterThan(72)
    })
  })

  describe('with a single row', () => {
    const options = build_bar_chart_options({
      ...base_args,
      data: [{ team: 'BUF', epa: 0.217 }]
    })

    it('draws one bar', () => {
      expect(bar_series_of(options).data).to.have.length(1)
    })

    it('still pins the baseline at zero rather than at the bar', () => {
      expect(options.yAxis.min).to.equal(0)
      expect(options.yAxis.max).to.be.greaterThan(0.217)
    })

    it('puts the average line on the bar, at a finite value', () => {
      const average_line = options.yAxis.plotLines.find(
        (line) => line.label?.text === 'Average'
      )
      expect(average_line.value).to.equal(0.217)
    })

    it('draws no zero baseline, since nothing is below it', () => {
      expect(
        options.yAxis.plotLines.filter(
          (line) => line.value === 0 && !line.label
        )
      ).to.have.length(0)
    })

    it('is not reported empty', () => {
      expect(options.custom.is_empty).to.equal(false)
    })
  })

  describe('with an empty result', () => {
    const options = build_bar_chart_options({ ...base_args, data: [] })

    it('is flagged empty so the component renders a message, not an axis pair', () => {
      expect(options.custom.is_empty).to.equal(true)
      expect(options.custom.row_count).to.equal(0)
    })

    it('carries an empty bar series rather than throwing', () => {
      expect(bar_series_of(options).data).to.deep.equal([])
    })

    it('draws no average line, since there is no average', () => {
      expect(
        options.yAxis.plotLines.filter((line) => line.label?.text === 'Average')
      ).to.have.length(0)
      expect(options.custom.average).to.equal(null)
    })

    it('leaves the axis unbounded rather than emitting NaN extremes', () => {
      expect(options.yAxis.min).to.equal(null)
      expect(options.yAxis.max).to.equal(null)
    })
  })

  describe('all-negative data', () => {
    const options = build_bar_chart_options({
      ...base_args,
      data: [
        { team: 'CLV', epa: -0.21 },
        { team: 'NYJ', epa: -0.141 }
      ]
    })

    it('hangs the bars from a zero ceiling', () => {
      expect(options.yAxis.max).to.equal(0)
      expect(options.yAxis.min).to.be.lessThan(-0.21)
    })

    it('still draws the zero baseline', () => {
      expect(
        options.yAxis.plotLines.some((line) => line.value === 0 && !line.label)
      ).to.equal(true)
    })
  })

  describe('provenance footer', () => {
    it('renders supplied text in the credits slot', () => {
      const options = build_bar_chart_options({
        ...base_args,
        footer_text: 'Data: xo.football | min 100 plays'
      })
      expect(options.credits.enabled).to.equal(true)
      expect(options.credits.text).to.equal('Data: xo.football | min 100 plays')
    })

    it('suppresses the Highcharts default credit when none is supplied', () => {
      expect(build_bar_chart_options(base_args).credits.enabled).to.equal(false)
    })
  })

  describe('custom text', () => {
    it('overrides the title, subtitle and both axis titles', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: {
          custom_title: 'EPA/P - 2023-2025',
          custom_subtitle: 'Regular season only',
          custom_x_axis_title: 'Team',
          custom_y_axis_title: 'EPA/P'
        }
      })
      expect(options.title.text).to.equal('EPA/P - 2023-2025')
      expect(options.subtitle.text).to.equal('Regular season only')
      expect(options.xAxis.title.text).to.equal('Team')
      expect(options.yAxis.title.text).to.equal('EPA/P')
    })

    it('renames the average line', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { average_line_label: 'League avg' }
      })
      expect(
        options.yAxis.plotLines.some(
          (line) => line.label?.text === 'League avg'
        )
      ).to.equal(true)
    })

    it('omits the average line when switched off', () => {
      const options = build_bar_chart_options({
        ...base_args,
        bar_chart_options: { show_average_line: false }
      })
      expect(
        options.yAxis.plotLines.filter((line) => line.label?.text === 'Average')
      ).to.have.length(0)
    })

    it('titles from the column when no custom title is given', () => {
      expect(build_bar_chart_options(base_args).title.text).to.equal(
        'EPA per play'
      )
    })

    it('falls back to a generic label when the column has none', () => {
      const options = build_bar_chart_options({ ...base_args, column: {} })
      expect(options.yAxis.title.text).to.equal('Value')
    })
  })

  // Highcharts reverses the category axis by default on an inverted chart, so
  // the same user-facing request -- run the ranking the other way -- has to be
  // written as a different `reversed` value in each orientation. Passing the
  // option straight through turns these four into two right and two wrong.
  describe('category axis direction', () => {
    const reversed_for = ({ orientation, reverse_category_axis }) =>
      build_bar_chart_options({
        ...base_args,
        bar_chart_options: { orientation, reverse_category_axis }
      }).xAxis.reversed

    it('runs the ranking up from the origin by default when vertical', () => {
      expect(reversed_for({ orientation: 'vertical' })).to.equal(false)
    })

    it('runs the ranking down from the top by default when horizontal', () => {
      expect(reversed_for({ orientation: 'horizontal' })).to.equal(true)
    })

    it('flips the vertical chart when reversed', () => {
      expect(
        reversed_for({ orientation: 'vertical', reverse_category_axis: true })
      ).to.equal(true)
    })

    it('flips the horizontal chart when reversed', () => {
      expect(
        reversed_for({ orientation: 'horizontal', reverse_category_axis: true })
      ).to.equal(false)
    })

    it('treats anything other than true as not reversed', () => {
      // The field defaults to OFF, so absence and an explicit false mean the
      // same thing -- unlike row_limit, where absence is a third state.
      expect(
        reversed_for({ orientation: 'vertical', reverse_category_axis: false })
      ).to.equal(false)
      expect(
        reversed_for({
          orientation: 'vertical',
          reverse_category_axis: undefined
        })
      ).to.equal(false)
    })
  })

  describe('tooltip', () => {
    it('names the subject and formats the value at chart precision', () => {
      const options = build_bar_chart_options(base_args)
      const text = options.tooltip.formatter.call({
        point: { label: 'BUF' },
        y: 0.217
      })
      expect(text).to.include('BUF')
      expect(text).to.include('0.217')
      expect(text).to.include('EPA per play')
    })
  })
})
