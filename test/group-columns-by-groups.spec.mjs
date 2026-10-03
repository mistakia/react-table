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

  describe('a column in several column groups', function () {
    const team = { column_group_id: 'TEAM_STATS' }
    const passing = { column_group_id: 'PASSING' }
    const rushing = { column_group_id: 'RUSHING' }
    const receiving = { column_group_id: 'RECEIVING' }
    const states = (n) => Array.from({ length: n }, () => ({ params: {} }))
    // A band reads as [header, children]; a column as its id.
    const describe_bands = (nodes) =>
      nodes.map((node) =>
        node.columns
          ? [node.header, describe_bands(node.columns)]
          : node.column_id
      )

    it('bands once where no neighbor shares its other group', function () {
      const groups = group_columns_by_groups(
        [
          { column_id: 'rush_att', column_groups: [rushing] },
          { column_id: 'rush_yds', column_groups: [rushing] },
          { column_id: 'scrimmage_tds', column_groups: [rushing, receiving] }
        ],
        states(3)
      )
      expect(describe_bands(groups)).to.eql([
        ['RUSHING', ['rush_att', 'rush_yds', 'scrimmage_tds']]
      ])
    })

    it('bands a lone column under one group', function () {
      const groups = group_columns_by_groups(
        [{ column_id: 'scrimmage_tds', column_groups: [rushing, receiving] }],
        states(1)
      )
      expect(describe_bands(groups)).to.eql([['RUSHING', ['scrimmage_tds']]])
    })

    it('still nests a group its neighbors share', function () {
      const groups = group_columns_by_groups(
        [
          { column_id: 'pass_att', column_groups: [team, passing] },
          { column_id: 'pass_yds', column_groups: [team, passing] },
          { column_id: 'rush_att', column_groups: [team, rushing] },
          { column_id: 'rush_yds', column_groups: [team, rushing] },
          { column_id: 'third_down', column_groups: [team, receiving] }
        ],
        states(5)
      )
      expect(describe_bands(groups)).to.eql([
        [
          'TEAM_STATS',
          [
            ['PASSING', ['pass_att', 'pass_yds']],
            ['RUSHING', ['rush_att', 'rush_yds']],
            'third_down'
          ]
        ]
      ])
    })
  })

  it("hands a param's formatter the column's other params", function () {
    const seen = []
    const groups = group_columns_by_groups(
      [
        {
          column_id: 'targets',
          column_params: {
            week: {
              format_value: ({ value, column_params }) => {
                seen.push(column_params)
                return `Week ${value}`
              }
            }
          }
        }
      ],
      [{ params: { year: 2026, week: 1 } }]
    )

    expect(seen[0]).to.eql({ year: 2026, week: 1 })
    expect(groups.map((group) => group.header)).to.include('2026')
  })
})
