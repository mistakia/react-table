import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'

import {
  resolve_token_color,
  with_alpha
} from '../src/utils/resolve-token-color.js'
import {
  CHART_COLOR_DEFAULTS,
  resolve_chart_colors
} from '../src/utils/chart-colors.js'

// What a real browser resolves (a host's var() and color-mix() values) is
// verified in one; happy-dom substitutes a var() but computes no colour, so
// these specs cover the paths that decide between the token and the fallback.

const root = () => document.documentElement

afterEach(() => {
  root().style.removeProperty('--rt-chart-ink')
  root().style.removeProperty('--rt-chart-mean')
})

describe('with_alpha', () => {
  it('turns a hex colour into rgba at the opacity', () => {
    expect(with_alpha('#b43c3c', 0.8)).to.equal('rgba(180, 60, 60, 0.8)')
  })

  it('turns an rgb() colour into rgba at the opacity', () => {
    expect(with_alpha('rgb(60, 60, 60)', 0.7)).to.equal('rgba(60, 60, 60, 0.7)')
  })

  it('multiplies an already translucent colour', () => {
    expect(with_alpha('rgba(0, 0, 0, 0.5)', 0.5)).to.equal(
      'rgba(0, 0, 0, 0.25)'
    )
  })

  it('returns a colour it cannot parse unchanged', () => {
    expect(with_alpha('transparent', 0.5)).to.equal('transparent')
  })
})

describe('resolve_token_color', () => {
  it('falls back to the default when the token is unset', () => {
    expect(resolve_token_color('--rt-chart-ink', '#333333')).to.equal('#333333')
  })

  it('applies the alpha to the fallback', () => {
    expect(
      resolve_token_color('--rt-chart-mean', '#b43c3c', { alpha: 0.9 })
    ).to.equal('rgba(180, 60, 60, 0.9)')
  })

  it('reads a token the host sets', () => {
    root().style.setProperty('--rt-chart-ink', '#123456')
    expect(resolve_token_color('--rt-chart-ink', '#333333')).to.equal('#123456')
  })

  it('applies the alpha to a token the host sets', () => {
    root().style.setProperty('--rt-chart-mean', 'rgb(200, 100, 50)')
    expect(
      resolve_token_color('--rt-chart-mean', '#b43c3c', { alpha: 0.8 })
    ).to.equal('rgba(200, 100, 50, 0.8)')
  })

  it('falls back when the token computes to no colour', () => {
    root().style.setProperty('--rt-chart-ink', 'not-a-colour')
    expect(resolve_token_color('--rt-chart-ink', '#333333')).to.equal('#333333')
  })

  it('falls back without a document', () => {
    const saved = globalThis.document
    delete globalThis.document
    try {
      expect(
        resolve_token_color('--rt-chart-mean', '#b43c3c', { alpha: 0.8 })
      ).to.equal('rgba(180, 60, 60, 0.8)')
    } finally {
      globalThis.document = saved
    }
  })
})

describe('resolve_chart_colors', () => {
  it('is the defaults when no token is set', () => {
    expect(resolve_chart_colors()).to.deep.equal(CHART_COLOR_DEFAULTS)
  })

  it('takes a role from its --rt-chart-* token', () => {
    root().style.setProperty('--rt-chart-ink', '#123456')
    expect(resolve_chart_colors().ink).to.equal('#123456')
  })
})
