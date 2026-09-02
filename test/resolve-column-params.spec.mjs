/* global describe it */
import { expect } from 'chai'

import {
  resolve_column_params,
  resolve_param_values,
  is_param_value_admissible
} from '#src/utils/resolve-column-params.js'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'

const data_type_select = TABLE_DATA_TYPES.SELECT

// The shape that produced the defect this module exists for: `selection_type`
// admits a different set depending on `market_type`, so a value that was
// correct when the column was added is unsatisfiable once the market changes.
const yes_no_markets = new Set(['ANYTIME_TOUCHDOWN'])
const market_of = (params) =>
  Array.isArray(params.market_type) ? params.market_type[0] : params.market_type

const betting_column_params = {
  market_type: {
    data_type: data_type_select,
    values: ['GAME_PASSING_YARDS', 'ANYTIME_TOUCHDOWN'],
    default_value: 'GAME_PASSING_YARDS',
    single: true
  },
  selection_type: {
    data_type: data_type_select,
    values: ['OVER', 'UNDER', 'YES', 'NO'],
    default_value: 'OVER',
    get_values: (params) =>
      yes_no_markets.has(market_of(params)) ? ['YES', 'NO'] : ['OVER', 'UNDER'],
    get_default_value: (params) =>
      yes_no_markets.has(market_of(params)) ? 'YES' : 'OVER'
  },
  time_type: {
    data_type: data_type_select,
    values: ['OPEN', 'CLOSE'],
    default_value: 'CLOSE',
    single: true
  }
}

// The two arity fields, which are NOT interchangeable: `single` caps a SELECT
// param's list at one element, `is_single` makes a RANGE param a scalar rather
// than a [min, max] pair.
const single_year = {
  data_type: data_type_select,
  values: [2022, 2023, 2024, 2025, 2026],
  default_value: 2026,
  single: true
}

const single_year_offset = {
  data_type: TABLE_DATA_TYPES.RANGE,
  min: -30,
  max: 30,
  default_value: 0,
  is_single: true
}

describe('resolve_column_params', function () {
  describe('adding a column', function () {
    it('fills every declared default', function () {
      const { params } = resolve_column_params({
        column_params: betting_column_params,
        data_type_select
      })

      expect(params).to.deep.equal({
        market_type: ['GAME_PASSING_YARDS'],
        selection_type: ['OVER'],
        time_type: ['CLOSE']
      })
    })

    it('applies a dynamic default that depends on a sibling default', function () {
      // The static default for market_type is an over/under market, so this
      // asserts the non-yes/no arm. The yes/no arm is reached by the edit path
      // below, which is where the shipped defect lived.
      const { params } = resolve_column_params({
        column_params: {
          ...betting_column_params,
          market_type: {
            ...betting_column_params.market_type,
            default_value: 'ANYTIME_TOUCHDOWN'
          }
        },
        data_type_select
      })

      expect(params.selection_type).to.deep.equal(['YES'])
    })
  })

  describe('editing a param', function () {
    it('repairs a sibling the new value makes unreachable', function () {
      // This is the exact production state: an ANYTIME_TOUCHDOWN column left
      // holding selection_type OVER, which matches no row in
      // prop_market_selections_index and rendered the column empty.
      const { params, reset_param_names } = resolve_column_params({
        column_params: betting_column_params,
        params: {
          market_type: ['ANYTIME_TOUCHDOWN'],
          selection_type: ['OVER'],
          time_type: ['CLOSE']
        },
        data_type_select,
        fill_unset: false
      })

      expect(params.selection_type).to.deep.equal(['YES'])
      expect(reset_param_names).to.deep.equal(['selection_type'])
    })

    it('preserves a sibling value that remains admissible', function () {
      const { params, reset_param_names } = resolve_column_params({
        column_params: betting_column_params,
        params: {
          market_type: ['ANYTIME_TOUCHDOWN'],
          selection_type: ['NO'],
          time_type: ['OPEN']
        },
        data_type_select,
        fill_unset: false
      })

      // NO is admissible for a yes/no market, so the user's choice stands.
      expect(params.selection_type).to.deep.equal(['NO'])
      expect(params.time_type).to.deep.equal(['OPEN'])
      expect(reset_param_names).to.deep.equal([])
    })

    it('does not fill an unset param when fill_unset is false', function () {
      // A where-clause entry carries only the params the user set; filling the
      // rest would silently narrow the filter.
      const { params } = resolve_column_params({
        column_params: betting_column_params,
        params: { market_type: ['GAME_PASSING_YARDS'] },
        data_type_select,
        fill_unset: false
      })

      expect(params).to.deep.equal({ market_type: ['GAME_PASSING_YARDS'] })
    })
  })

  describe('params with no declared value set', function () {
    it('leaves a param carrying neither values nor get_values alone', function () {
      const column_params = {
        free_text: { data_type: TABLE_DATA_TYPES.TEXT },
        year: { data_type: TABLE_DATA_TYPES.RANGE }
      }
      const { params, reset_param_names } = resolve_column_params({
        column_params,
        params: { free_text: 'anything', year: [2020, 2024] },
        data_type_select,
        fill_unset: false
      })

      expect(params).to.deep.equal({
        free_text: 'anything',
        year: [2020, 2024]
      })
      expect(reset_param_names).to.deep.equal([])
    })

    it('is a no-op for a column declaring no params at all', function () {
      const { params, reset_param_names } = resolve_column_params({
        column_params: undefined,
        params: { held: ['value'] },
        data_type_select
      })

      expect(params).to.deep.equal({ held: ['value'] })
      expect(reset_param_names).to.deep.equal([])
    })
  })

  describe('resolve_param_values', function () {
    it('prefers get_values over the static declaration', function () {
      expect(
        resolve_param_values({
          param_definition: betting_column_params.selection_type,
          params: { market_type: ['ANYTIME_TOUCHDOWN'] }
        })
      ).to.deep.equal(['YES', 'NO'])
    })

    it('falls back to the static values when no get_values is declared', function () {
      expect(
        resolve_param_values({
          param_definition: betting_column_params.time_type,
          params: {}
        })
      ).to.deep.equal(['OPEN', 'CLOSE'])
    })
  })

  describe('is_param_value_admissible', function () {
    it('rejects a value the current siblings exclude', function () {
      expect(
        is_param_value_admissible({
          param_definition: betting_column_params.selection_type,
          params: { market_type: ['ANYTIME_TOUCHDOWN'] },
          value: ['OVER']
        })
      ).to.equal(false)
    })

    it('accepts the same value under a market that admits it', function () {
      // The control for the assertion above: the value is unchanged and only
      // the sibling moved, so a matcher that stopped matching would fail here.
      expect(
        is_param_value_admissible({
          param_definition: betting_column_params.selection_type,
          params: { market_type: ['GAME_PASSING_YARDS'] },
          value: ['OVER']
        })
      ).to.equal(true)
    })

    it('treats an unset value as nothing to judge', function () {
      expect(
        is_param_value_admissible({
          param_definition: betting_column_params.selection_type,
          params: { market_type: ['ANYTIME_TOUCHDOWN'] },
          value: undefined
        })
      ).to.equal(true)
    })
  })

  describe('arity', function () {
    it('rejects a pair on an `is_single` RANGE param', function () {
      // A RANGE param declares no `values`, so membership alone returns true
      // for every one of them and would never reach this.
      expect(
        is_param_value_admissible({
          param_definition: single_year_offset,
          params: {},
          value: [0, 3]
        })
      ).to.equal(false)
    })

    it('accepts a scalar on an `is_single` RANGE param', function () {
      expect(
        is_param_value_admissible({
          param_definition: single_year_offset,
          params: {},
          value: 0
        })
      ).to.equal(true)
    })

    it('accepts a pair on a RANGE param that is not `is_single`', function () {
      // The control: only `is_single` moved, so a check that stopped judging
      // shape would fail here.
      expect(
        is_param_value_admissible({
          param_definition: { ...single_year_offset, is_single: false },
          params: {},
          value: [0, 3]
        })
      ).to.equal(true)
    })

    it('repairs a pair stored on an `is_single` RANGE param', function () {
      const { params, reset_param_names } = resolve_column_params({
        column_params: { year_offset: single_year_offset },
        params: { year_offset: [0, 3] },
        data_type_select,
        fill_unset: false
      })

      expect(reset_param_names).to.eql(['year_offset'])
      expect(params.year_offset).to.equal(0)
    })

    it('LEAVES a multi-value list on a `single` SELECT param alone', function () {
      // `single` is deliberately not judged. Its verdict depends on the active
      // row axes via enable_multi_on_split, and the row-axes control writes
      // row_axes without re-resolving params — so judging it here would destroy
      // a legitimate multi-year list the moment the user turned the split off
      // and edited any sibling. The census found 9 such stored values across 5
      // league saved views and 0 genuinely broken ones.
      const { params, reset_param_names } = resolve_column_params({
        column_params: { year: single_year },
        params: { year: [2022, 2023, 2024, 2025, 2026] },
        data_type_select,
        fill_unset: false
      })

      expect(reset_param_names).to.eql([])
      expect(params.year).to.eql([2022, 2023, 2024, 2025, 2026])
    })
  })
})
