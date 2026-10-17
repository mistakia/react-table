/* global describe it */
import { expect } from 'chai'

import { resolve_carried_column_params } from '#src/utils/resolve-carried-column-params.js'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'

const data_type_select = TABLE_DATA_TYPES.SELECT

// The reported defect: a field is COPIED carrying a rate type such as "per
// game", its stat is then edited to one that does not serve that rate, and the
// view dies on the server's refusal. The carry kept a param whenever the new
// column merely DECLARED it — and `output` is declared on every from-plays and
// ratio column — so the incompatible rate rode across and the request was
// rejected downstream.
//
// `output` stores an object while its `values` are `{value,label}` period
// options, so the generic membership test cannot judge it: it compares a period
// string to the object and fails for EVERY value. The league predicate is
// declared as `is_value_admissible` for exactly that reason, and this suite
// stands in for it with the same contract.
const output_param = ({ periods }) => ({
  label: 'Output',
  default_value: null,
  values: periods.map((period) => ({ value: period, label: period })),
  is_value_admissible: ({ value, param_definition }) =>
    !value || !value.period
      ? true
      : param_definition.values.some((option) => option.value === value.period)
})

// A receiving column serves the player periods; a routes column does not.
const receiving_column = {
  output: output_param({
    periods: ['game', 'season', 'player_route', 'player_target']
  })
}
const routes_column = {
  output: output_param({ periods: ['game', 'season'] })
}

const carry = ({ previous_params, next_column_params }) =>
  resolve_carried_column_params({
    previous_params,
    next_column_params,
    data_type_select
  })

describe('resolve_carried_column_params', () => {
  it('UNAPPLIES a rate the new column does not serve', () => {
    const params = carry({
      previous_params: {
        output: { period: 'player_route', aggregation: 'rate' }
      },
      next_column_params: routes_column
    })

    // Dropped outright, not reset to a default: `output` declares
    // `default_value: null`, so a reset would have nothing to put here and the
    // stale rate would survive the edit exactly as reported.
    expect(params).to.not.have.property('output')
  })

  it('KEEPS a rate the new column does serve', () => {
    const output = { period: 'game', aggregation: 'rate' }
    const params = carry({
      previous_params: { output },
      next_column_params: receiving_column
    })

    expect(params.output).to.eql(output)
  })

  it('KEEPS a rate when the new column serves it, across a differing list', () => {
    // The mirror of the defect: editing routes -> receiving must not lose a
    // player-period rate the receiving column offers.
    const output = { period: 'player_route', aggregation: 'rate' }
    const params = carry({
      previous_params: { output },
      next_column_params: receiving_column
    })

    expect(params.output).to.eql(output)
  })

  it('drops a param the new column does not declare', () => {
    const params = carry({
      previous_params: {
        output: { period: 'game', aggregation: 'rate' },
        nfl_week_id: ['current_year_reg_weeks']
      },
      next_column_params: routes_column
    })

    expect(params).to.eql({ output: { period: 'game', aggregation: 'rate' } })
  })

  it('keeps nothing when the new column declares no params', () => {
    const params = carry({
      previous_params: { output: { period: 'game', aggregation: 'rate' } },
      next_column_params: null
    })

    expect(params).to.eql({})
  })

  it('leaves an unset output unset rather than inventing one', () => {
    const params = carry({
      previous_params: { output: null },
      next_column_params: routes_column
    })

    // `fill_unset: false`: an absent param is a deliberate state on an edit.
    expect(params.output).to.equal(null)
  })

  it('re-resolves a SIBLING a surviving param makes unreachable', () => {
    // The case the shared resolver exists for, still reachable from the carry
    // path: a surviving market_type can strand its selection_type.
    const yes_no_markets = new Set(['ANYTIME_TOUCHDOWN'])
    const market_of = (params) =>
      Array.isArray(params.market_type)
        ? params.market_type[0]
        : params.market_type

    const betting_column = {
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
          yes_no_markets.has(market_of(params))
            ? ['YES', 'NO']
            : ['OVER', 'UNDER'],
        get_default_value: (params) =>
          yes_no_markets.has(market_of(params)) ? 'YES' : 'OVER'
      }
    }

    const params = carry({
      previous_params: {
        market_type: ['ANYTIME_TOUCHDOWN'],
        selection_type: ['OVER']
      },
      next_column_params: betting_column
    })

    expect(params.market_type).to.eql(['ANYTIME_TOUCHDOWN'])
    expect(params.selection_type).to.eql(['YES'])
  })

  it('drops an object-valued param that declares no admissibility hook', () => {
    // Without the hook the generic membership test judges the period string
    // against the object and refuses every value — which is why the hook
    // exists, and why this fix cannot be done in the generic test alone.
    const no_hook_column = {
      output: {
        label: 'Output',
        default_value: null,
        values: [{ value: 'game', label: 'game' }]
      }
    }

    const params = carry({
      previous_params: { output: { period: 'game', aggregation: 'rate' } },
      next_column_params: no_hook_column
    })

    expect(params).to.not.have.property('output')
  })
})
