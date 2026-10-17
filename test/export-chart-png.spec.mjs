import { describe, it } from 'mocha'
import { expect } from 'chai'

import { export_chart_png } from '../src/utils/export-chart-png.js'

// The pre-fix handler passed only { type: 'image/png' }, so Highcharts fell
// back to a 600x600 source size and squished the chart. Measured on the
// contributor's export: the PNG was exactly 1200x1200 (600x600 at the default
// scale 2). Every assertion below fails against that handler.

describe('export_chart_png', () => {
  it('passes the live rendered size as sourceWidth/sourceHeight', () => {
    let captured = null
    const chart = {
      chartWidth: 1120,
      chartHeight: 600,
      exportChartLocal: (options) => {
        captured = options
      }
    }
    export_chart_png(chart)
    expect(captured.type).to.equal('image/png')
    expect(captured.sourceWidth).to.equal(1120)
    expect(captured.sourceHeight).to.equal(600)
  })

  it('does not square a non-square chart', () => {
    let captured = null
    const chart = {
      chartWidth: 1120,
      chartHeight: 600,
      exportChartLocal: (options) => {
        captured = options
      }
    }
    export_chart_png(chart)
    expect(captured.sourceWidth).to.not.equal(captured.sourceHeight)
  })

  it('prefers exportChartLocal over exportChart', () => {
    let local = false
    let server = false
    const chart = {
      chartWidth: 1120,
      chartHeight: 600,
      exportChartLocal: () => {
        local = true
      },
      exportChart: () => {
        server = true
      }
    }
    export_chart_png(chart)
    expect(local).to.equal(true)
    expect(server).to.equal(false)
  })

  it('falls back to exportChart when exportChartLocal is absent', () => {
    let captured = null
    const chart = {
      chartWidth: 900,
      chartHeight: 600,
      exportChart: (options) => {
        captured = options
      }
    }
    export_chart_png(chart)
    expect(captured.sourceWidth).to.equal(900)
    expect(captured.sourceHeight).to.equal(600)
  })

  it('is a no-op for a null chart', () => {
    expect(() => export_chart_png(null)).to.not.throw()
  })

  it('omits a zero dimension so Highcharts keeps its own fallback', () => {
    let captured = null
    const chart = {
      chartWidth: 0,
      chartHeight: 600,
      exportChartLocal: (options) => {
        captured = options
      }
    }
    export_chart_png(chart)
    expect(captured.sourceWidth).to.be.undefined
    expect(captured.sourceHeight).to.equal(600)
  })
})
