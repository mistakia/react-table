/* global describe it */
import { expect } from 'chai'

import {
  resolve_param_definition_across_records,
  CONFLICT_REASONS
} from '#src/utils/resolve-param-definition-across-records.js'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'

// A record as the parameters editor builds it: a column id for the refusal
// message and `get_params()` for sibling-dependent value resolution.
const make_record = ({ column_id, params = {} }) => ({
  column_id,
  get_params: () => params
})

const make_entry = ({ column_id, params, ...param_definition }) => ({
  record: make_record({ column_id, params }),
  param_definition
})

// The two real league declarations behind the reproduction: `year_offset` is a
// RANGE param declared with `is_single` on the keeptradecut columns and without
// it on the from-plays columns.
const single_year_offset = {
  column_id: 'player_keeptradecut_value',
  data_type: TABLE_DATA_TYPES.RANGE,
  is_single: true,
  default_value: 0,
  min: -30,
  max: 30
}

const range_year_offset = {
  column_id: 'player_games_played',
  data_type: TABLE_DATA_TYPES.RANGE,
  min: -30,
  max: 30
}

describe('resolve_param_definition_across_records', function () {
  describe('degenerate inputs', function () {
    it('returns nothing for no entries', function () {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({ entries: [] })
      expect(param_definition).to.equal(null)
      expect(conflict).to.equal(null)
    })

    it('returns a single record definition unchanged', function () {
      const entry = make_entry({
        column_id: 'player_games_played',
        data_type: TABLE_DATA_TYPES.SELECT,
        values: [2024, 2025]
      })
      const { param_definition, conflict } =
        resolve_param_definition_across_records({ entries: [entry] })
      expect(param_definition).to.equal(entry.param_definition)
      expect(conflict).to.equal(null)
    })
  })

  // The property the whole task exists for.
  describe('order independence', function () {
    it('resolves identically in both click orders', function () {
      const wide = make_entry({
        column_id: 'player_startable_games_from_seasonlogs',
        data_type: TABLE_DATA_TYPES.SELECT,
        values: [2015, 2024, 2025, 2026],
        default_value: 2015
      })
      const narrow = make_entry({
        column_id: 'player_espn_line_win_rate',
        data_type: TABLE_DATA_TYPES.SELECT,
        values: [2024, 2025, 2026],
        default_value: 2026
      })

      const forward = resolve_param_definition_across_records({
        entries: [wide, narrow]
      })
      const reverse = resolve_param_definition_across_records({
        entries: [narrow, wide]
      })

      expect(forward.param_definition.values).to.eql([2024, 2025, 2026])
      expect(reverse.param_definition.values).to.eql([2024, 2025, 2026])
      expect(forward.conflict).to.equal(null)
      expect(reverse.conflict).to.equal(null)
    })

    it('offers no year the narrower column cannot answer', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'player_startable_games_from_seasonlogs',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2015, 2016, 2024]
          }),
          make_entry({
            column_id: 'player_espn_line_win_rate',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2024, 2025, 2026]
          })
        ]
      })
      expect(param_definition.values).to.not.include(2015)
    })
  })

  describe('values intersection', function () {
    it('keeps the { value, label } object form', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [
              { value: 'half_ppr_12_team', label: 'Half PPR 12 Team' },
              { value: 'draftkings_classic', label: 'DraftKings Classic' }
            ]
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [{ value: 'half_ppr_12_team', label: 'Half PPR 12 Team' }]
          })
        ]
      })
      expect(param_definition.values).to.eql([
        { value: 'half_ppr_12_team', label: 'Half PPR 12 Team' }
      ])
    })

    it('intersects the object form against the primitive form', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [
              { value: 'OPEN', label: 'Open' },
              { value: 'CLOSE', label: 'Close' }
            ]
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: ['CLOSE']
          })
        ]
      })
      expect(param_definition.values).to.eql([
        { value: 'CLOSE', label: 'Close' }
      ])
    })

    it('skips a record that declares no value set', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: ['OPEN', 'CLOSE']
          }),
          make_entry({ column_id: 'b', data_type: TABLE_DATA_TYPES.SELECT })
        ]
      })
      expect(param_definition.values).to.eql(['OPEN', 'CLOSE'])
    })

    // `selection_type` declares get_values and no static values, so a raw
    // `values` intersection would be empty for it.
    it('resolves values per record against that record own siblings', function () {
      const get_values = (params) =>
        params.market_type === 'ANYTIME_TOUCHDOWN'
          ? ['YES', 'NO']
          : ['OVER', 'UNDER', 'YES', 'NO']

      const { param_definition, conflict } =
        resolve_param_definition_across_records({
          entries: [
            make_entry({
              column_id: 'a',
              params: { market_type: 'ANYTIME_TOUCHDOWN' },
              data_type: TABLE_DATA_TYPES.SELECT,
              get_values
            }),
            make_entry({
              column_id: 'b',
              params: { market_type: 'GAME_PASSING_YARDS' },
              data_type: TABLE_DATA_TYPES.SELECT,
              get_values
            })
          ]
        })

      expect(conflict).to.equal(null)
      expect(param_definition.values).to.eql(['YES', 'NO'])
    })
  })

  describe('dynamic_values', function () {
    it('intersects by dynamic_type', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'nfl_week_id',
            data_type: TABLE_DATA_TYPES.SELECT,
            dynamic_values: [
              { dynamic_type: 'current_year_reg_weeks', label: 'Reg Weeks' },
              { dynamic_type: 'current_week', label: 'Current Week' }
            ]
          }),
          make_entry({
            column_id: 'single_nfl_week_id',
            data_type: TABLE_DATA_TYPES.SELECT,
            dynamic_values: [
              { dynamic_type: 'current_week', label: 'Current Week' }
            ]
          })
        ]
      })
      expect(param_definition.dynamic_values).to.eql([
        { dynamic_type: 'current_week', label: 'Current Week' }
      ])
    })
  })

  describe('bounds', function () {
    it('takes the tightest overlap and never drops a supplied bound', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.RANGE,
            min: -30,
            max: 30,
            step: 1
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.RANGE,
            min: -10,
            max: 10,
            step: 5
          })
        ]
      })
      expect(param_definition.min).to.equal(-10)
      expect(param_definition.max).to.equal(10)
      expect(param_definition.step).to.equal(1)
    })

    // calculate_width calls .toString() on both unguarded.
    it('keeps a bound only one record declares', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.RANGE,
            min: -30,
            max: 30
          }),
          make_entry({ column_id: 'b', data_type: TABLE_DATA_TYPES.RANGE })
        ]
      })
      expect(param_definition.min).to.equal(-30)
      expect(param_definition.max).to.equal(30)
    })
  })

  describe('arity and permissiveness fields', function () {
    it('intersects enable_multi_on_split rather than unioning it', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            single: true,
            enable_multi_on_split: ['year', 'week']
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            single: true,
            enable_multi_on_split: ['year']
          })
        ]
      })
      expect(param_definition.enable_multi_on_split).to.eql(['year'])
    })

    it('takes the most restrictive single', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({ column_id: 'a', data_type: TABLE_DATA_TYPES.SELECT }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            single: true
          })
        ]
      })
      expect(param_definition.single).to.equal(true)
    })

    it('unions enable_on_row_axes', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            enable_on_row_axes: ['year']
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            enable_on_row_axes: ['week']
          })
        ]
      })
      expect(param_definition.enable_on_row_axes).to.eql(['year', 'week'])
    })

    it('hides the parameter when any record hides it', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({ column_id: 'a', data_type: TABLE_DATA_TYPES.SELECT }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            hidden: true
          })
        ]
      })
      expect(param_definition.hidden).to.equal(true)
    })
  })

  describe('default_value', function () {
    it('keeps a default that survives the intersection', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2024, 2025],
            default_value: 2025
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2025, 2026]
          })
        ]
      })
      expect(param_definition.default_value).to.equal(2025)
    })

    it('drops a default the intersection excludes', function () {
      const { param_definition } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2024, 2025],
            default_value: 2024
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: [2025, 2026]
          })
        ]
      })
      expect(param_definition.default_value).to.equal(undefined)
    })
  })

  describe('refusals', function () {
    it('refuses on an is_single disagreement and names both sides', function () {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({
          entries: [
            make_entry(single_year_offset),
            make_entry(range_year_offset)
          ]
        })

      expect(param_definition).to.equal(null)
      expect(conflict.reason).to.equal(CONFLICT_REASONS.ARITY)
      expect(conflict.groups).to.have.length(2)
      expect(conflict.groups[0].label).to.equal('take a single value')
      expect(conflict.groups[0].column_ids).to.eql([
        'player_keeptradecut_value'
      ])
      expect(conflict.groups[1].label).to.equal('take a range')
      expect(conflict.groups[1].column_ids).to.eql(['player_games_played'])
    })

    it('refuses identically in both click orders', function () {
      const forward = resolve_param_definition_across_records({
        entries: [make_entry(single_year_offset), make_entry(range_year_offset)]
      })
      const reverse = resolve_param_definition_across_records({
        entries: [make_entry(range_year_offset), make_entry(single_year_offset)]
      })

      expect(forward.conflict.reason).to.equal(reverse.conflict.reason)
      expect(forward.param_definition).to.equal(null)
      expect(reverse.param_definition).to.equal(null)
    })

    it('refuses on an empty values intersection and reports what each accepts', function () {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({
          entries: [
            make_entry({
              column_id: 'player_game_prop_line_from_betting_markets',
              data_type: TABLE_DATA_TYPES.SELECT,
              values: ['GAME_PASSING_YARDS', 'GAME_RUSHING_YARDS']
            }),
            make_entry({
              column_id: 'team_game_prop_line_from_betting_markets',
              data_type: TABLE_DATA_TYPES.SELECT,
              values: ['GAME_TOTAL', 'GAME_SPREAD']
            })
          ]
        })

      expect(param_definition).to.equal(null)
      expect(conflict.reason).to.equal(CONFLICT_REASONS.NO_ADMISSIBLE_VALUES)
      expect(conflict.groups).to.have.length(2)
      expect(conflict.groups[0].value).to.eql([
        'GAME_PASSING_YARDS',
        'GAME_RUSHING_YARDS'
      ])
      expect(conflict.groups[1].value).to.eql(['GAME_TOTAL', 'GAME_SPREAD'])
    })

    // The real time_type pair: 10 betting-market columns against 114 seasonlog
    // columns, with no value in common.
    it('refuses the disjoint time_type pair', function () {
      const { conflict } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'player_game_prop_line_from_betting_markets',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: ['OPEN', 'CLOSE']
          }),
          make_entry({
            column_id: 'league_nfl_team_seasonlogs_rank',
            data_type: TABLE_DATA_TYPES.SELECT,
            values: ['SEASON', 'LAST_THREE', 'LAST_FOUR', 'LAST_EIGHT']
          })
        ]
      })
      expect(conflict.reason).to.equal(CONFLICT_REASONS.NO_ADMISSIBLE_VALUES)
    })

    it('refuses on a data_type disagreement', function () {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({
          entries: [
            make_entry({ column_id: 'a', data_type: TABLE_DATA_TYPES.SELECT }),
            make_entry({ column_id: 'b', data_type: TABLE_DATA_TYPES.RANGE })
          ]
        })
      expect(param_definition).to.equal(null)
      expect(conflict.reason).to.equal(CONFLICT_REASONS.INCOMPATIBLE_CONTROL)
      expect(conflict.field).to.equal('data_type')
    })

    it('refuses when only one record declares a custom component', function () {
      const { conflict } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.SELECT,
            component: function ColumnParamMonthDay() {
              return null
            }
          }),
          make_entry({ column_id: 'b', data_type: TABLE_DATA_TYPES.SELECT })
        ]
      })
      expect(conflict.reason).to.equal(CONFLICT_REASONS.INCOMPATIBLE_CONTROL)
      expect(conflict.field).to.equal('component')
    })

    it('refuses on a column_specs disagreement', function () {
      const { conflict } = resolve_param_definition_across_records({
        entries: [
          make_entry({
            column_id: 'a',
            data_type: TABLE_DATA_TYPES.OBJECT_PRESET,
            column_specs: [{ key: 'depth' }]
          }),
          make_entry({
            column_id: 'b',
            data_type: TABLE_DATA_TYPES.OBJECT_PRESET,
            column_specs: [{ key: 'depth' }, { key: 'width' }]
          })
        ]
      })
      expect(conflict.reason).to.equal(CONFLICT_REASONS.INCOMPATIBLE_CONTROL)
      expect(conflict.field).to.equal('column_specs')
    })

    // `single` is SELECT-only and never changes stored shape, so unlike
    // `is_single` it merges instead of refusing.
    it('does not refuse on a single disagreement', function () {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({
          entries: [
            make_entry({
              column_id: 'a',
              data_type: TABLE_DATA_TYPES.SELECT,
              single: true
            }),
            make_entry({ column_id: 'b', data_type: TABLE_DATA_TYPES.SELECT })
          ]
        })
      expect(conflict).to.equal(null)
      expect(param_definition.single).to.equal(true)
    })
  })
})
