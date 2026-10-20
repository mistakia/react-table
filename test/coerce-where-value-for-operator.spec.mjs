/* global describe it */

import { expect } from 'chai'

import { coerce_where_value_for_operator } from '#src/utils/coerce-where-value-for-operator.mjs'

describe('coerce_where_value_for_operator', function () {
  it('collapses a list to its first value when switching to a single-value operator', function () {
    for (const operator of ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'ILIKE']) {
      expect(
        coerce_where_value_for_operator({ operator, value: ['RB'] }),
        operator
      ).to.equal('RB')
    }
    expect(
      coerce_where_value_for_operator({ operator: '=', value: ['RB', 'WR'] })
    ).to.equal('RB')
    expect(
      coerce_where_value_for_operator({ operator: '=', value: [] })
    ).to.equal('')
  })

  it('wraps a single value in a list when switching to IN or NOT IN', function () {
    expect(
      coerce_where_value_for_operator({ operator: 'IN', value: 'RB' })
    ).to.deep.equal(['RB'])
    expect(
      coerce_where_value_for_operator({ operator: 'NOT IN', value: '' })
    ).to.deep.equal([])
    expect(
      coerce_where_value_for_operator({ operator: 'IN', value: 0 })
    ).to.deep.equal([0])
  })

  it('leaves a scalar alone across single-value operators', function () {
    expect(
      coerce_where_value_for_operator({ operator: '>=', value: '1000' })
    ).to.equal('1000')
  })
})
