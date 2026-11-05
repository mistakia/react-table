/* global describe it */
import { expect } from 'chai'

import { is_param_definition_enabled } from '#src/utils/is-param-definition-enabled.js'

describe('is_param_definition_enabled', function () {
  it('offers a param that declares no gate everywhere', function () {
    const param_definition = { data_type: 1 }
    expect(is_param_definition_enabled({ param_definition })).to.equal(true)
    expect(
      is_param_definition_enabled({
        param_definition,
        row_axes: ['year'],
        row_grain: 'nfl'
      })
    ).to.equal(true)
  })

  it('offers an enable_on_row_axes param only under one of its axes', function () {
    const param_definition = { enable_on_row_axes: ['year'] }
    expect(is_param_definition_enabled({ param_definition })).to.equal(false)
    expect(
      is_param_definition_enabled({ param_definition, row_axes: ['week'] })
    ).to.equal(false)
    expect(
      is_param_definition_enabled({
        param_definition,
        row_axes: ['year', 'week']
      })
    ).to.equal(true)
  })

  it('hides a disable_on_row_axes param under any axis', function () {
    const param_definition = { disable_on_row_axes: true }
    expect(is_param_definition_enabled({ param_definition })).to.equal(true)
    expect(
      is_param_definition_enabled({ param_definition, row_axes: ['year'] })
    ).to.equal(false)
  })

  it('offers an enable_on_row_grains param only at one of its grains', function () {
    const param_definition = { enable_on_row_grains: ['player', 'team'] }
    expect(
      is_param_definition_enabled({ param_definition, row_grain: 'team' })
    ).to.equal(true)
    expect(
      is_param_definition_enabled({ param_definition, row_grain: 'nfl' })
    ).to.equal(false)
  })

  it('stands the grain gate aside when no grain is known', function () {
    const param_definition = { enable_on_row_grains: ['player'] }
    expect(is_param_definition_enabled({ param_definition })).to.equal(true)
  })

  it('applies the axis and grain gates together', function () {
    const param_definition = {
      enable_on_row_axes: ['year'],
      enable_on_row_grains: ['player', 'team']
    }
    expect(
      is_param_definition_enabled({
        param_definition,
        row_axes: ['year'],
        row_grain: 'nfl'
      })
    ).to.equal(false)
    expect(
      is_param_definition_enabled({
        param_definition,
        row_axes: [],
        row_grain: 'team'
      })
    ).to.equal(false)
    expect(
      is_param_definition_enabled({
        param_definition,
        row_axes: ['year'],
        row_grain: 'team'
      })
    ).to.equal(true)
  })
})
