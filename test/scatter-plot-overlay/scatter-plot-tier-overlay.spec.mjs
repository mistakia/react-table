import { describe, it } from 'mocha'
import { expect } from 'chai'

import { build_tier_series } from '../../src/scatter-plot-overlay/scatter-plot-tier-overlay.js'

describe('build_tier_series', () => {
  it('empty input returns []', () => {
    expect(build_tier_series({ x_values: [], y_values: [] })).to.deep.equal([])
  })

  it('single point returns []', () => {
    expect(build_tier_series({ x_values: [1], y_values: [2] })).to.deep.equal(
      []
    )
  })

  it('null / undefined inputs return []', () => {
    expect(build_tier_series({ x_values: null, y_values: null })).to.deep.equal(
      []
    )
    expect(
      build_tier_series({ x_values: undefined, y_values: undefined })
    ).to.deep.equal([])
  })

  it('5 well-spaced points produce 4 series with correct quintile k values', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })

    expect(result).to.have.lengthOf(4)

    const k0 = result[0].data[0][0] + result[0].data[0][1]
    const k1 = result[1].data[0][0] + result[1].data[0][1]
    const k2 = result[2].data[0][0] + result[2].data[0][1]
    const k3 = result[3].data[0][0] + result[3].data[0][1]

    expect(k0).to.be.closeTo(3.6, 1e-5)
    expect(k1).to.be.closeTo(5.2, 1e-5)
    expect(k2).to.be.closeTo(6.8, 1e-5)
    expect(k3).to.be.closeTo(8.4, 1e-5)
  })

  it('all inputs identical produces output or handles degenerate case sensibly', () => {
    const x_values = [2, 2, 2, 2, 2]
    const y_values = [2, 2, 2, 2, 2]
    const result = build_tier_series({ x_values, y_values })
    expect(Array.isArray(result)).to.equal(true)
    expect(result.length).to.equal(0)
  })

  it('NaN entries are dropped before computing', () => {
    const x_values = [1, NaN, 3, 4, 5, 6, 7, 8, 9, 10]
    const y_values = [1, 2, NaN, 4, 5, 6, 7, 8, 9, 10]
    const result = build_tier_series({ x_values, y_values })
    expect(Array.isArray(result)).to.equal(true)
    expect(result.length).to.be.greaterThan(0)
  })

  it('each series has enableMouseTracking: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.enableMouseTracking).to.equal(false)
    })
  })

  it('each series is dashed (visually distinct from solid lines)', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(typeof series.dashStyle).to.equal('string')
      expect(series.dashStyle).to.not.equal('Solid')
    })
  })

  it('each series has showInLegend: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.showInLegend).to.equal(false)
    })
  })

  it('each series has marker.enabled: false', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.marker.enabled).to.equal(false)
    })
  })

  it('series segments stay within the data bounding box', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const x_min = 1
    const x_max = 5
    const y_min = 1
    const y_max = 5
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      const [sx, sy] = series.data[0]
      const [ex, ey] = series.data[1]
      expect(sx).to.be.at.least(x_min)
      expect(sx).to.be.at.most(x_max)
      expect(ex).to.be.at.least(x_min)
      expect(ex).to.be.at.most(x_max)
      expect(sy).to.be.at.least(y_min)
      expect(sy).to.be.at.most(y_max)
      expect(ey).to.be.at.least(y_min)
      expect(ey).to.be.at.most(y_max)
      expect(sx).to.be.lessThan(ex)
    })
  })

  it('large-x / small-y data does not produce y-extending lines', () => {
    const x_values = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]
    const y_values = [50, 80, 90, 70, 60, 100, 40, 110, 30, 20]
    const y_min = 20
    const y_max = 110
    const result = build_tier_series({ x_values, y_values })
    expect(result.length).to.be.greaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([, y]) => {
        expect(y).to.be.at.least(y_min)
        expect(y).to.be.at.most(y_max)
      })
    })
  })

  it('tall-y / narrow-x data does not produce x-extending lines', () => {
    const x_values = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]
    const y_values = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]
    const x_min = 10
    const x_max = 28
    const result = build_tier_series({ x_values, y_values })
    expect(result.length).to.be.greaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([x]) => {
        expect(x).to.be.at.least(x_min)
        expect(x).to.be.at.most(x_max)
      })
    })
  })

  it('negatively-correlated data clips correctly on both axes', () => {
    const x_values = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    const y_values = [900, 800, 700, 600, 500, 400, 300, 200, 100, 0]
    const result = build_tier_series({ x_values, y_values })
    const x_min = 0
    const x_max = 900
    const y_min = 0
    const y_max = 900
    expect(result.length).to.be.greaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([x, y]) => {
        expect(x).to.be.at.least(x_min)
        expect(x).to.be.at.most(x_max)
        expect(y).to.be.at.least(y_min)
        expect(y).to.be.at.most(y_max)
      })
    })
  })

  it('series type is line', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [1, 2, 3, 4, 5]
    const result = build_tier_series({ x_values, y_values })
    result.forEach((series) => {
      expect(series.type).to.equal('line')
    })
  })

  // Offense EPA (higher is better) against defense EPA allowed (lower is
  // better): a good team is high x and low y, so tiers must hold x - y fixed.
  it('a reversed y axis orients the lines to x - y = k', () => {
    const x_values = [1, 2, 3, 4, 5]
    const y_values = [5, 4, 3, 2, 1]
    const result = build_tier_series({ x_values, y_values, y_reversed: true })

    expect(result).to.have.lengthOf(4)
    result.forEach((series) => {
      const [[x0, y0], [x1, y1]] = series.data
      expect(x0 - y0).to.be.closeTo(series.custom.tier_k, 1e-9)
      expect(x1 - y1).to.be.closeTo(series.custom.tier_k, 1e-9)
      expect(x0).to.be.below(x1)
      expect(series.custom.tier_y_sign).to.equal(-1)
      expect(series.custom.tier_x_sign).to.equal(1)
    })
  })

  it('a reversed y axis keeps segments inside the data bounding box', () => {
    const x_values = [-0.19, -0.05, 0.02, 0.17, 0.35]
    const y_values = [0.19, -0.18, 0.05, -0.1, -0.01]
    const result = build_tier_series({ x_values, y_values, y_reversed: true })

    expect(result.length).to.be.greaterThan(0)
    result.forEach((series) => {
      series.data.forEach(([x, y]) => {
        expect(x).to.be.within(-0.19 - 1e-9, 0.35 + 1e-9)
        expect(y).to.be.within(-0.18 - 1e-9, 0.19 + 1e-9)
      })
    })
  })
})
