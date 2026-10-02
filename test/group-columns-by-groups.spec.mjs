import { describe, it } from 'mocha'
import { expect } from 'chai'

import group_columns_by_groups from '../src/utils/group-columns-by-groups.js'

describe('group_columns_by_groups', function () {
  it('bands a column group by its label, falling back to the id', function () {
    const labelled = {
      column_group_id: 'BETTING_MARKETS',
      label: 'Betting Markets'
    }
    const bare = { column_group_id: 'PASSING' }
    const groups = group_columns_by_groups(
      [
        { column_id: 'line', column_groups: [labelled] },
        { column_id: 'odds', column_groups: [labelled] },
        { column_id: 'yards', column_groups: [bare] }
      ],
      [{ params: {} }, { params: {} }, { params: {} }]
    )

    expect(groups.map((group) => group.header)).to.eql([
      'Betting Markets',
      'PASSING'
    ])
  })
})
