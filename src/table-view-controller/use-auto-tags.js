import { useMemo, useRef } from 'react'

/**
 * Deterministic 4-axis auto-tag derivation.
 *
 * Axis 1 — Subject: player-stats | team-stats | defense-stats
 * Axis 2 — Position: qb | rb | wr | te | multi-position | team-level
 * Axis 3 — Metric domain: opportunity | efficiency | betting-markets |
 *                         projections | trade-values | play-by-play
 * Axis 4 — Time horizon: current-week | season-to-date | multi-season | historical
 *
 * Returns string[] (0–4 elements, one per axis that fires).
 */
export function derive_auto_tags_impl(view, all_columns) {
  const columns = view.table_state ? view.table_state.columns || [] : []
  const where = view.table_state ? view.table_state.where || [] : []
  const row_axes = view.table_state ? view.table_state.row_axes || [] : []
  const view_name = view.view_name || ''

  const col_ids = columns.map((c) =>
    typeof c === 'string' ? c : c && c.column_id ? c.column_id : ''
  )

  const tags = []

  // Axis 1 — Subject
  const subject = derive_subject(col_ids)
  if (subject) tags.push(subject)

  // Axis 2 — Position
  const position = derive_position(where, view_name, subject)
  if (position) tags.push(position)

  // Axis 3 — Metric domain
  const metric = derive_metric_domain(col_ids)
  if (metric) tags.push(metric)

  // Axis 4 — Time horizon
  const time = derive_time_horizon(view_name, row_axes)
  if (time) tags.push(time)

  return tags
}

function derive_subject(col_ids) {
  if (!col_ids.length) return null

  const total = col_ids.length
  let player_count = 0
  let team_count = 0
  let defense_count = 0

  for (const id of col_ids) {
    if (/pff_team_grades_|coverage_/i.test(id)) {
      defense_count++
    } else if (/^player_/i.test(id)) {
      player_count++
    } else if (/^team_/i.test(id)) {
      team_count++
    }
  }

  if (defense_count > 0) return 'defense-stats'
  if (player_count / total > 0.5) return 'player-stats'
  if (team_count / total > 0.5) return 'team-stats'
  return null
}

function derive_position(where, view_name, subject) {
  const pos_filter = where.find(
    (w) => w.column_id === 'player_position' || w.column_id === 'pos'
  )

  const position_map = { QB: 'qb', RB: 'rb', WR: 'wr', TE: 'te' }

  if (pos_filter) {
    const val = pos_filter.value
    if (Array.isArray(val)) {
      if (val.length === 1) {
        return position_map[String(val[0]).toUpperCase()] || 'multi-position'
      }
      return 'multi-position'
    }
    if (typeof val === 'string') {
      return position_map[val.toUpperCase()] || 'multi-position'
    }
  }

  const name_upper = view_name.toUpperCase()
  const name_positions = ['QB', 'RB', 'WR', 'TE'].filter((p) =>
    new RegExp(`\\b${p}\\b`).test(name_upper)
  )

  if (name_positions.length === 1) {
    return position_map[name_positions[0]]
  }
  if (name_positions.length > 1) {
    return 'multi-position'
  }

  if (subject === 'player-stats') return 'multi-position'
  if (subject === 'team-stats' || subject === 'defense-stats')
    return 'team-level'
  return null
}

function derive_metric_domain(col_ids) {
  if (!col_ids.length) return null

  for (const id of col_ids) {
    if (/_game_prop_|_betting_markets/i.test(id)) return 'betting-markets'
  }
  for (const id of col_ids) {
    if (/_week_projected_|_season_projected_/i.test(id)) return 'projections'
  }
  for (const id of col_ids) {
    if (/_keeptradecut_|_ngs_draft_grade$|_espn_overall_score$/i.test(id))
      return 'trade-values'
  }
  for (const id of col_ids) {
    if (/_air_yards_|_target_share_|_weighted_opportunity_|_routes$/i.test(id))
      return 'opportunity'
  }
  for (const id of col_ids) {
    if (/_pff_|_ngs_|_espn_|_expected_points_|_success_rate_/i.test(id))
      return 'efficiency'
  }
  for (const id of col_ids) {
    if (/_from_plays$/i.test(id)) return 'play-by-play'
  }

  return null
}

function derive_time_horizon(view_name, row_axes) {
  if (/matchup preview|week \d|this week/i.test(view_name))
    return 'current-week'
  if (/by week|weekly/i.test(view_name) && row_axes.length > 0)
    return 'season-to-date'
  if (/\b\d{4}[-–]\d{4}\b/.test(view_name)) return 'multi-season'
  if (/historical/i.test(view_name)) return 'historical'
  return 'season-to-date'
}

/**
 * Hook: memoizes derive_auto_tags calls per view_id + stable table_state hash.
 *
 * Accepts an injected derive_auto_tags function (or falls back to the built-in
 * derive_auto_tags_impl when undefined — legacy mode returns []).
 *
 * Returns a Map<view_id, string[]>.
 */
function stable_hash(table_state) {
  try {
    return JSON.stringify(table_state)
  } catch {
    return ''
  }
}

export function use_auto_tags(views, all_columns, derive_auto_tags) {
  const cache_ref = useRef(new Map())

  return useMemo(() => {
    if (!derive_auto_tags) {
      return new Map()
    }

    const result = new Map()
    const next_cache = new Map()

    for (const view of views) {
      const key = `${view.view_id}::${stable_hash(view.table_state)}`
      if (cache_ref.current.has(key)) {
        result.set(view.view_id, cache_ref.current.get(key))
        next_cache.set(key, cache_ref.current.get(key))
      } else {
        const tags = derive_auto_tags(view, all_columns) || []
        result.set(view.view_id, tags)
        next_cache.set(key, tags)
      }
    }

    cache_ref.current = next_cache
    return result
  }, [views, all_columns, derive_auto_tags])
}

export default use_auto_tags
