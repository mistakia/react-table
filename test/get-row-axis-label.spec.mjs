/* global describe it */
import { expect } from 'chai'

import get_row_axis_label from '#src/utils/get-row-axis-label.js'

describe('get_row_axis_label', function () {
  it('labels an axis declared as a column with that column header', () => {
    const all_columns = {
      wager_season_year: {
        column_id: 'wager_season_year',
        header_label: 'SEASON'
      }
    }
    expect(
      get_row_axis_label({ row_axis: 'wager_season_year', all_columns })
    ).to.equal('SEASON')
  })

  it('falls back to the axis id when no column declares it', () => {
    expect(
      get_row_axis_label({ row_axis: 'wager_leg_count', all_columns: {} })
    ).to.equal('wager_leg_count')
    expect(get_row_axis_label({ row_axis: 'week' })).to.equal('week')
  })

  it('falls back to the axis id when the column has no header', () => {
    const all_columns = { year: { column_id: 'year' } }
    expect(get_row_axis_label({ row_axis: 'year', all_columns })).to.equal(
      'year'
    )
  })
})
