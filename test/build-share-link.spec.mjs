import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  build_share_link,
  build_share_link_params
} from '#src/utils/build-share-link.mjs'

// What this file is defending, in one sentence: a copied link must name the
// route that READS a query string, not the route the copier was standing on.
//
// The regression it pins was measured on xo.football 2026-09-16. A user opened
// a generation share at `/s/<share_id>`, generated a completely different view
// over it, and copied the link. The button minted
// `/s/<share_id>?columns=<the new view>` -- and `/s/:share_id` hydrates its
// state from the stored share and ignores the query string, so both the browser
// and the generation agent's link resolver rebuilt the ORIGINAL share. The
// copier saw one view and every reader got another, silently.
//
// The discriminating case is therefore the one where the current path and the
// declared path DIFFER. A spec that only ever passes `/data-views` for both is
// green under the old rule and the new one alike and proves nothing.

const ON_SCREEN_STATE = {
  columns: ['player_pass_yds'],
  prefix_columns: ['player_name'],
  where: [{ column_id: 'player_position', operator: 'IN', value: ['QB'] }]
}

// The path the old rule would have used: a stored-record route, which is where
// the two answers come apart.
const STORED_RECORD_PATHNAME = '/s/dd2410cb5b706b5f'
const STATE_CARRYING_PATHNAME = '/data-views'
const ORIGIN = 'https://xo.football'

describe('build_share_link', () => {
  it('names the declared state-carrying route, not the stored-record route the user is on', () => {
    const link = build_share_link({
      table_state: ON_SCREEN_STATE,
      origin: ORIGIN,
      current_pathname: STORED_RECORD_PATHNAME,
      share_link_pathname: STATE_CARRYING_PATHNAME
    })

    const url = new URL(link)
    expect(url.pathname).to.equal(STATE_CARRYING_PATHNAME)
    // The share id must not survive anywhere in the link. A reader that finds
    // it -- in the path or smuggled into a param -- can resolve the stale view.
    expect(link).to.not.include('dd2410cb5b706b5f')
  })

  it('carries the ON-SCREEN state, so the link and the copier agree', () => {
    const link = build_share_link({
      table_state: ON_SCREEN_STATE,
      origin: ORIGIN,
      current_pathname: STORED_RECORD_PATHNAME,
      share_link_pathname: STATE_CARRYING_PATHNAME
    })

    const url = new URL(link)
    expect(JSON.parse(url.searchParams.get('columns'))).to.eql([
      'player_pass_yds'
    ])
    expect(JSON.parse(url.searchParams.get('where'))).to.eql(
      ON_SCREEN_STATE.where
    )
  })

  it('carries the view identity when a view is selected', () => {
    const link = build_share_link({
      table_state: ON_SCREEN_STATE,
      selected_view: {
        view_id: 'abc-123',
        view_name: 'QB passing',
        view_description: 'per game'
      },
      origin: ORIGIN,
      current_pathname: STATE_CARRYING_PATHNAME,
      share_link_pathname: STATE_CARRYING_PATHNAME
    })

    const url = new URL(link)
    expect(url.searchParams.get('view_id')).to.equal('abc-123')
    expect(url.searchParams.get('view_name')).to.equal('QB passing')
  })

  // THE CONTROL. Without a declared route there is no second answer available,
  // so the current path is correct rather than merely tolerated -- and this is
  // what keeps a consumer with one table route working unchanged. A fix that
  // hardcoded a path would turn this case red.
  it('falls back to the current path when the consumer declares no route', () => {
    const link = build_share_link({
      table_state: ON_SCREEN_STATE,
      origin: ORIGIN,
      current_pathname: '/community/tables'
    })

    expect(new URL(link).pathname).to.equal('/community/tables')
  })

  // THE SECOND CONTROL. On the ordinary table route the declared path and the
  // current path are the same string, so the change is a no-op there. A green
  // here alongside a green above is what says the fix moved only the diverging
  // case.
  it('is unchanged on the ordinary table route, where the two paths agree', () => {
    const declared = build_share_link({
      table_state: ON_SCREEN_STATE,
      origin: ORIGIN,
      current_pathname: STATE_CARRYING_PATHNAME,
      share_link_pathname: STATE_CARRYING_PATHNAME
    })
    const undeclared = build_share_link({
      table_state: ON_SCREEN_STATE,
      origin: ORIGIN,
      current_pathname: STATE_CARRYING_PATHNAME
    })

    expect(declared).to.equal(undeclared)
  })
})

describe('build_share_link_params', () => {
  it('omits empty arrays and objects rather than emitting them', () => {
    const params = build_share_link_params({
      table_state: { columns: [], rank_aggregation: {} }
    })

    expect(params.get('columns')).to.equal(null)
    expect(params.get('rank_aggregation')).to.equal(null)
  })

  it('emits a false boolean, so a stale true cannot survive a round-trip', () => {
    const params = build_share_link_params({
      table_state: { columns: ['player_pass_yds'] }
    })

    expect(params.get('disable_scatter_plot')).to.equal('false')
    expect(params.get('disable_bar_chart')).to.equal('false')
  })
})
