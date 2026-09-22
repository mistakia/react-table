import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  resolve_no_data_reason,
  NO_DATA_GENERIC,
  NO_DATA_SEASON_UNAVAILABLE
} from '../src/utils/resolve-no-data-reason.js'

// This module is the single owner of whether the header warns AT ALL, not just
// of the wording -- `table-header.js` renders its icon on a non-null return.
// So a null here is a suppressed warning, and these cover both the wording and
// the precedence between the two inputs, which is where a plausible
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

  // PRECEDENCE, and the case that was wrong in production for the whole time
  // this feature shipped. An attributed season beats the loaded rows, because
  // the two are independent facts rather than competing claims about the same
  // one: publication cadence is a static property of the source, so a stray row
  // does not make an unpublished season published.
  //
  // This is the ONLY assertion here that distinguishes the fixed resolver from
  // the original -- every other case passes under both. Under the original it
  // returned null, which is why the season wording never rendered once against
  // the live database: every declaring column measured carried a few non-null
  // rows in the unpublished season.
  it('names the unpublished season even when stray rows populate the column', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: false,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set([
          'startable_games_from_seasonlogs_0'
        ])
      })
    ).to.equal(NO_DATA_SEASON_UNAVAILABLE)
  })

  // The other half of the precedence rule, and the reason this is a reordering
  // rather than a removal. With no cause named there is nothing but the rows to
  // go on, so a populated column still says nothing at all.
  it('stays silent on a populated column the consumer did not attribute', () => {
    expect(
      resolve_no_data_reason({
        has_no_data: false,
        accessor_path: 'startable_games_from_seasonlogs_0',
        season_unavailable_column_ids: new Set(['some_other_column_0'])
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
