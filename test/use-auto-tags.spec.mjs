import { describe, it } from 'mocha'
import { expect } from 'chai'

import { derive_auto_tags_impl } from '../src/table-view-controller/use-auto-tags.js'

// ── helper ────────────────────────────────────────────────────────────────────
const make_view = ({
  view_name = 'Test View',
  columns = [],
  where = [],
  splits = []
} = {}) => ({
  view_name,
  view_id: 'test-view-id',
  table_state: { columns, where, splits }
})

const col = (id) => id
const where_pos = (val) => ({
  column_id: 'player_position',
  value: val
})

// ── Axis 1: Subject ───────────────────────────────────────────────────────────
describe('derive_auto_tags_impl — Axis 1: Subject', () => {
  it('emits player-stats when >50% of columns are player_*', () => {
    const view = make_view({
      columns: [
        col('player_name'),
        col('player_age'),
        col('player_team'),
        col('week')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('player-stats')
  })

  it('emits team-stats when >50% of columns are team_*', () => {
    const view = make_view({
      columns: [
        col('team_name'),
        col('team_wins'),
        col('team_losses'),
        col('week')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('team-stats')
  })

  it('emits defense-stats when pff_team_grades_ column present', () => {
    const view = make_view({
      columns: [col('pff_team_grades_defense'), col('player_name')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('defense-stats')
  })

  it('defense-stats takes priority over player-stats', () => {
    const view = make_view({
      columns: [
        col('player_name'),
        col('player_age'),
        col('player_team'),
        col('pff_team_grades_coverage')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('defense-stats')
    expect(tags).to.not.include('player-stats')
  })

  it('emits no subject tag when columns are empty', () => {
    const view = make_view({ columns: [] })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.not.include('player-stats')
    expect(tags).to.not.include('team-stats')
    expect(tags).to.not.include('defense-stats')
  })

  it('emits no subject when mix is below 50% threshold', () => {
    const view = make_view({
      columns: [
        col('player_name'),
        col('team_name'),
        col('week'),
        col('season')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.not.include('player-stats')
    expect(tags).to.not.include('team-stats')
  })

  it('emits at most one subject tag', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')]
    })
    const tags = derive_auto_tags_impl(view, {})
    const subject_tags = tags.filter((t) =>
      ['player-stats', 'team-stats', 'defense-stats'].includes(t)
    )
    expect(subject_tags.length).to.be.at.most(1)
  })
})

// ── Axis 2: Position ──────────────────────────────────────────────────────────
describe('derive_auto_tags_impl — Axis 2: Position', () => {
  it('emits qb for single QB where filter', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos('QB')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('qb')
  })

  it('emits rb for single RB where filter', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos('RB')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('rb')
  })

  it('emits wr for single WR where filter', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos('WR')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('wr')
  })

  it('emits te for single TE where filter', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos('TE')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('te')
  })

  it('emits multi-position for multiple-value where filter', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos(['QB', 'WR'])]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('multi-position')
  })

  it('emits qb from view_name regex match', () => {
    const view = make_view({
      view_name: 'QB Stats 2024',
      columns: [col('player_name'), col('player_age'), col('player_team')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('qb')
  })

  it('emits multi-position when view_name matches two positions', () => {
    const view = make_view({
      view_name: 'WR and TE Routes',
      columns: [col('player_name'), col('player_age'), col('player_team')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('multi-position')
  })

  it('emits multi-position for player-stats views with no position signal', () => {
    const view = make_view({
      view_name: 'All Player Stats',
      columns: [col('player_name'), col('player_age'), col('player_team')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('multi-position')
  })

  it('emits team-level for team-stats subject', () => {
    const view = make_view({
      view_name: 'Team Rankings',
      columns: [
        col('team_name'),
        col('team_wins'),
        col('team_losses'),
        col('z')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('team-level')
  })

  it('emits at most one position tag', () => {
    const view = make_view({
      columns: [col('player_name'), col('player_age'), col('player_team')],
      where: [where_pos('QB')]
    })
    const tags = derive_auto_tags_impl(view, {})
    const pos_tags = tags.filter((t) =>
      ['qb', 'rb', 'wr', 'te', 'multi-position', 'team-level'].includes(t)
    )
    expect(pos_tags.length).to.be.at.most(1)
  })
})

// ── Axis 3: Metric domain ─────────────────────────────────────────────────────
describe('derive_auto_tags_impl — Axis 3: Metric domain', () => {
  it('emits betting-markets for _game_prop_ columns (betting-prop cluster)', () => {
    const view = make_view({
      columns: [col('player_passing_yards_game_prop_over')]
    })
    expect(derive_auto_tags_impl(view, {})).to.include('betting-markets')
  })

  it('emits projections for _week_projected_ columns (fantasy-projection cluster)', () => {
    const view = make_view({ columns: [col('player_week_projected_points')] })
    expect(derive_auto_tags_impl(view, {})).to.include('projections')
  })

  it('emits trade-values for _keeptradecut_ columns (dynasty/trade cluster)', () => {
    const view = make_view({ columns: [col('player_keeptradecut_value')] })
    expect(derive_auto_tags_impl(view, {})).to.include('trade-values')
  })

  it('emits opportunity for _air_yards_ columns', () => {
    const view = make_view({ columns: [col('player_air_yards_total')] })
    expect(derive_auto_tags_impl(view, {})).to.include('opportunity')
  })

  it('emits opportunity for _target_share_ columns', () => {
    const view = make_view({ columns: [col('player_target_share_season')] })
    expect(derive_auto_tags_impl(view, {})).to.include('opportunity')
  })

  it('emits efficiency for _pff_ columns (advanced-research cluster)', () => {
    const view = make_view({ columns: [col('player_pff_grade')] })
    expect(derive_auto_tags_impl(view, {})).to.include('efficiency')
  })

  it('emits play-by-play for _from_plays columns (situational cluster)', () => {
    const view = make_view({ columns: [col('player_yards_from_plays')] })
    expect(derive_auto_tags_impl(view, {})).to.include('play-by-play')
  })

  it('betting-markets takes priority over projections when both match', () => {
    const view = make_view({
      columns: [
        col('player_passing_yards_game_prop_over'),
        col('player_week_projected_points')
      ]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.include('betting-markets')
    expect(tags).to.not.include('projections')
  })

  it('emits at most one metric domain tag', () => {
    const view = make_view({
      columns: [col('player_pff_grade'), col('player_air_yards_total')]
    })
    const metric_tags = derive_auto_tags_impl(view, {}).filter((t) =>
      [
        'opportunity',
        'efficiency',
        'betting-markets',
        'projections',
        'trade-values',
        'play-by-play'
      ].includes(t)
    )
    expect(metric_tags.length).to.be.at.most(1)
  })
})

// ── Axis 4: Time horizon ──────────────────────────────────────────────────────
describe('derive_auto_tags_impl — Axis 4: Time horizon', () => {
  it('emits current-week for "matchup preview" in view_name (weekly-matchup cluster)', () => {
    const view = make_view({ view_name: 'Week 14 Matchup Preview' })
    expect(derive_auto_tags_impl(view, {})).to.include('current-week')
  })

  it('emits current-week for "this week" in view_name', () => {
    const view = make_view({ view_name: 'This Week RB Rankings' })
    expect(derive_auto_tags_impl(view, {})).to.include('current-week')
  })

  it('emits season-to-date for "by week" + non-empty splits (1st-quarter cluster)', () => {
    const view = make_view({
      view_name: 'QB Stats By Week',
      splits: ['week']
    })
    expect(derive_auto_tags_impl(view, {})).to.include('season-to-date')
  })

  it('emits multi-season for year-range pattern in view_name', () => {
    const view = make_view({ view_name: 'RB Rankings 2022-2024' })
    expect(derive_auto_tags_impl(view, {})).to.include('multi-season')
  })

  it('emits historical for "historical" in view_name', () => {
    const view = make_view({ view_name: 'Historical Passing Stats' })
    expect(derive_auto_tags_impl(view, {})).to.include('historical')
  })

  it('emits season-to-date as fallback for views with no temporal signal', () => {
    const view = make_view({ view_name: 'Player Stats' })
    expect(derive_auto_tags_impl(view, {})).to.include('season-to-date')
  })

  it('emits at most one time-horizon tag', () => {
    const view = make_view({ view_name: 'QB Stats' })
    const time_tags = derive_auto_tags_impl(view, {}).filter((t) =>
      ['current-week', 'season-to-date', 'multi-season', 'historical'].includes(
        t
      )
    )
    expect(time_tags.length).to.be.at.most(1)
  })
})

// ── One tag per axis cap ──────────────────────────────────────────────────────
describe('derive_auto_tags_impl — one-tag-per-axis cap', () => {
  it('emits at most 4 tags total (one per axis)', () => {
    const view = make_view({
      view_name: 'QB Betting Props Matchup Preview',
      columns: [
        col('player_name'),
        col('player_age'),
        col('player_team'),
        col('player_passing_yards_game_prop_over')
      ],
      where: [where_pos('QB')]
    })
    const tags = derive_auto_tags_impl(view, {})
    expect(tags.length).to.be.at.most(4)
  })

  it('handles view with no table_state gracefully', () => {
    const view = { view_name: 'Minimal', view_id: 'x' }
    const tags = derive_auto_tags_impl(view, {})
    expect(tags).to.be.an('array')
    expect(tags.length).to.be.at.most(4)
  })
})
