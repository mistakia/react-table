import { describe, it } from 'mocha'
import { expect } from 'chai'

import { drop_inactive_row_axis_where } from '../src/utils/row-axis-where.js'

const year_filter = { column_id: 'year', operator: 'IN', value: [2024] }
const age_filter = { column_id: 'player_age', operator: '>=', value: 25 }

describe('drop_inactive_row_axis_where', () => {
  it('keeps an axis filter while its axis is active', () => {
    const where = [year_filter, age_filter]
    expect(
      drop_inactive_row_axis_where({
        where,
        row_axes: ['year'],
        row_axis_ids: ['year']
      })
    ).to.equal(where)
  })

  it('drops an axis filter once its axis is removed', () => {
    expect(
      drop_inactive_row_axis_where({
        where: [year_filter, age_filter],
        row_axes: [],
        row_axis_ids: ['year']
      })
    ).to.deep.equal([age_filter])
  })

  it('leaves a row on an axis the consumer offers no filter for', () => {
    const where = [year_filter, age_filter]
    expect(
      drop_inactive_row_axis_where({ where, row_axes: [], row_axis_ids: [] })
    ).to.equal(where)
  })
})
