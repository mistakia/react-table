import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  resolve_no_data_reason,
  NO_DATA_GENERIC,
  NO_DATA_SEASON_UNAVAILABLE
} from '../src/utils/resolve-no-data-reason.js'

// The header already warned on an empty column; only the WORDING was
// cause-blind. These cover the three renders that matter and, more importantly,
// the precedence between the two inputs -- which is where a plausible
// implementation goes wrong.

describe('resolve_no_data_reason', () => {
  it('names the unpublished season when the consumer attributes it', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: true,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set([
          'startable_games_from_seasonlogs_0'
        ])
      })
    ).to.equal(NO_DATA_SEASON_UNAVAILABLE)
  })

  it('falls back to the generic wording for an empty column with no cause', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: true,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set()
      })
    ).to.equal(NO_DATA_GENERIC)
  })

  it('returns nothing for a column that holds values', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: false,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set()
      })
    ).to.equal(null)
  })

  // PRECEDENCE, and the case a plausible implementation gets wrong. The loaded
  // rows win: a consumer's list says which columns it EXPECTS to be empty, and
  // being wrong about one must not put a warning on a column full of values.
  it('shows no warning when the consumer claims a populated column', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: false,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set([
          'startable_games_from_seasonlogs_0'
        ])
      })
    ).to.equal(null)
  })

  // The duplicated-column case, which is where the key space earns its
  // `_${column_index}` suffix: two instances of one column id must be able to
  // disagree, or the feature annotates both or neither.
  it('distinguishes two instances of the same column', () => {
    const season_unavailable_column_ids = new Set([
      'startable_games_from_seasonlogs_1'
    ])
    expect(
      resolve_no_data_reason({
        has_no_data: true,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids
      })
    ).to.equal(NO_DATA_GENERIC)
    expect(
      resolve_no_data_reason({
        has_no_data: true,
        accessor_path: 'startable_games_from_seasonlogs_1',
        season_unavailable_column_ids
      })
    ).to.equal(NO_DATA_SEASON_UNAVAILABLE)
  })

  // The consumer is optional. Every other table using this component passes
  // nothing and must keep the wording it has today.
  it('keeps the generic wording when no set is supplied at all', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: true,
        accessor_path: 'startable_games_from_seasonlogs_0'
      })
    ).to.equal(NO_DATA_GENERIC)
  })

  // The two messages must actually differ, or every assertion above is
  // satisfied by a constant.
  it('uses two distinct messages', () => {
    expect(NO_DATA_GENERIC).to.not.equal(NO_DATA_SEASON_UNAVAILABLE)
  })
})
