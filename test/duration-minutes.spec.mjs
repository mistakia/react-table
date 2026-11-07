/* global describe it */

import { expect } from 'chai'

import {
  parse_duration_minutes,
  format_duration_minutes
} from '#src/utils/duration-minutes.mjs'

describe('parse_duration_minutes', function () {
  it('reads a whole number with m, h or d as minutes', function () {
    expect(parse_duration_minutes('90m')).to.equal(90)
    expect(parse_duration_minutes('4h')).to.equal(240)
    expect(parse_duration_minutes('2d')).to.equal(2880)
    expect(parse_duration_minutes(' 1H ')).to.equal(60)
  })

  it('reads a bare 0 as zero minutes', function () {
    expect(parse_duration_minutes('0')).to.equal(0)
  })

  it('refuses anything outside the duration grammar', function () {
    for (const text of ['', '90', '1.5h', '-1h', '2w', 'h', '1h30m', null]) {
      expect(parse_duration_minutes(text), String(text)).to.equal(null)
    }
  })
})

describe('format_duration_minutes', function () {
  it('formats minutes as the largest whole unit', function () {
    expect(format_duration_minutes(1440)).to.equal('1d')
    expect(format_duration_minutes(240)).to.equal('4h')
    expect(format_duration_minutes(90)).to.equal('90m')
    expect(format_duration_minutes(0)).to.equal('0')
  })

  it('renders an unset bound as empty and a non-minute value as written', function () {
    expect(format_duration_minutes(null)).to.equal('')
    expect(format_duration_minutes(undefined)).to.equal('')
    expect(format_duration_minutes('')).to.equal('')
    expect(format_duration_minutes(1.5)).to.equal('1.5')
  })

  it('round-trips through parse', function () {
    for (const minutes of [0, 1, 59, 60, 90, 240, 1440, 2880, 1500]) {
      expect(parse_duration_minutes(format_duration_minutes(minutes))).to.equal(
        minutes
      )
    }
  })
})
