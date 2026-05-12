import { useMemo } from 'react'

import { fuzzy_match } from '#src/utils'

/**
 * Classify a view into ownership sections.
 * Returns 'mine' | 'favorites' | 'shared' | 'system'
 * A view can appear in multiple sections (favorites + mine, favorites + shared).
 */
function classify_view(view, table_username, favorite_view_ids) {
  const sections = []
  const is_fav =
    favorite_view_ids &&
    (favorite_view_ids instanceof Set
      ? favorite_view_ids.has(view.view_id)
      : Boolean(
          typeof favorite_view_ids.includes === 'function' &&
            favorite_view_ids.includes(view.view_id)
        ))

  const is_mine =
    table_username &&
    view.view_username &&
    view.view_username === table_username

  const is_system = !view.view_username || view.view_username === 'system'

  if (is_mine) sections.push('mine')
  if (is_fav) sections.push('favorites')
  if (!is_mine && !is_system) sections.push('shared')
  if (is_system) sections.push('system')

  return sections.length ? sections : ['shared']
}

/**
 * Build a combined tag array for a view: persisted (user + llm) + auto.
 */
function get_all_tags(view, tags_by_view_id, auto_tags_map) {
  const persisted =
    tags_by_view_id && tags_by_view_id.get
      ? tags_by_view_id.get(view.view_id) || []
      : []
  const auto = (auto_tags_map && auto_tags_map.get(view.view_id)) || []
  return [
    ...persisted,
    ...auto.map((name) => ({ name, source: 'auto' }))
  ]
}

/**
 * Hook: applies the ownership → tag → fuzzy filter → sectioning pipeline.
 *
 * @param {object} params
 * @param {array}  params.views              - Raw view array
 * @param {string} params.table_username     - Current user's username
 * @param {Set}    params.favorite_view_ids  - Immutable Set (or array) of favorited view_ids
 * @param {Map}    params.tags_by_view_id    - Map<view_id, [{name, source}]>
 * @param {Map}    params.auto_tags_map      - Map<view_id, string[]> from use_auto_tags
 * @param {string} params.filter_text        - Fuzzy-filter input
 * @param {Set}    params.active_tag_filters - Set of tag names to AND-filter by
 * @param {string} params.active_section     - 'all'|'mine'|'favorites'|'shared'|'system'
 *
 * @returns {{ sections: object, counts: object, filtered: array }}
 */
export function use_organized_views({
  views = [],
  table_username,
  favorite_view_ids,
  tags_by_view_id,
  auto_tags_map,
  filter_text = '',
  active_tag_filters,
  active_section = 'all'
}) {
  return useMemo(() => {
    const has_org =
      table_username ||
      (favorite_view_ids && favorite_view_ids.size > 0) ||
      tags_by_view_id

    const section_map = { mine: [], favorites: [], shared: [], system: [] }
    const counts = { mine: 0, favorites: 0, shared: 0, system: 0 }

    for (const view of views) {
      const all_tags = get_all_tags(view, tags_by_view_id, auto_tags_map)
      const view_with_tags = { ...view, tags: all_tags }

      // Tag filter (AND across active filters)
      if (active_tag_filters && active_tag_filters.size > 0) {
        const tag_names = new Set(all_tags.map((t) => t.name))
        let passes = true
        for (const filter_tag of active_tag_filters) {
          if (!tag_names.has(filter_tag)) {
            passes = false
            break
          }
        }
        if (!passes) continue
      }

      // Fuzzy filter
      if (filter_text && !fuzzy_match(filter_text, view_with_tags)) continue

      if (!has_org) {
        section_map.shared.push(view_with_tags)
        counts.shared++
        continue
      }

      const sections = classify_view(view, table_username, favorite_view_ids)
      for (const s of sections) {
        counts[s]++
        if (active_section === 'all' || active_section === s) {
          if (!section_map[s].find((v) => v.view_id === view.view_id)) {
            section_map[s].push(view_with_tags)
          }
        }
      }
    }

    const filtered =
      active_section === 'all'
        ? views
            .map((v) => ({
              ...v,
              tags: get_all_tags(v, tags_by_view_id, auto_tags_map)
            }))
            .filter((v) => {
              if (active_tag_filters && active_tag_filters.size > 0) {
                const tag_names = new Set(v.tags.map((t) => t.name))
                for (const f of active_tag_filters) {
                  if (!tag_names.has(f)) return false
                }
              }
              if (filter_text && !fuzzy_match(filter_text, v)) return false
              return true
            })
        : section_map[active_section] || []

    return { sections: section_map, counts, filtered }
  }, [
    views,
    table_username,
    favorite_view_ids,
    tags_by_view_id,
    auto_tags_map,
    filter_text,
    active_tag_filters,
    active_section
  ])
}

export default use_organized_views
