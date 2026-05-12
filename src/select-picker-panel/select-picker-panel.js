import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import CheckIcon from '@mui/icons-material/Check'
import SearchIcon from '@mui/icons-material/Search'

import { get_string_from_object } from '#src/utils'

import './select-picker-panel.styl'

const DEFAULT_SEARCH_THRESHOLD = 8
const ROOT_GROUP_ID = '__all__'

// Flatten a group tree into a render list with depth + descendant ids per node.
const flatten_groups = (groups, depth = 0, acc = []) => {
  if (!Array.isArray(groups)) return acc
  for (const group of groups) {
    acc.push({ ...group, depth })
    if (group.children) flatten_groups(group.children, depth + 1, acc)
  }
  return acc
}

const collect_group_ids = (groups, target_id, collecting = false) => {
  let ids = []
  if (!Array.isArray(groups)) return ids
  for (const group of groups) {
    const matches = group.id === target_id
    if (matches || collecting) ids.push(group.id)
    if (group.children) {
      ids = ids.concat(
        collect_group_ids(group.children, target_id, collecting || matches)
      )
    }
  }
  return ids
}

export const render_icon = (icon, classname = 'rt-spp-icon') => {
  if (!icon) return null
  if (typeof icon === 'string')
    return <img className={classname} src={icon} alt='' />
  return <span className={classname}>{icon}</span>
}

/**
 * Generic select panel. Renders dropdown contents only — the surrounding
 * trigger / popper / chip is the caller's responsibility.
 *
 * `items`: [{
 *   id,          // unique key
 *   label,       // display string
 *   icon?,       // url string or ReactNode
 *   group?,      // group id (used when value_groups is provided OR to render flat sticky headers)
 *   kind?,       // 'value' (default) | 'preset' | 'dynamic'
 *   selected?,   // boolean
 *   mixed?,      // boolean — render as indeterminate (mixed-state)
 *   tag?,        // small badge to the right of label (e.g. 'Default', 'Preset')
 *   suffix?      // arbitrary ReactNode (e.g. dynamic value input)
 * }]
 */
export default function SelectPickerPanel({
  items,
  value_groups,
  is_multi = false,
  is_single = false,
  show_search,
  search_threshold = DEFAULT_SEARCH_THRESHOLD,
  width,
  chromeless = false,
  on_select,
  on_select_all,
  on_clear,
  on_close,
  select_all_label = 'All',
  clear_label = 'Clear',
  selected_count_label,
  search_placeholder = 'Search',
  group_label_for_flat
}) {
  const [search, set_search] = useState('')
  const [active_group_id, set_active_group_id] = useState(ROOT_GROUP_ID)

  const has_groups_tree = Array.isArray(value_groups) && value_groups.length > 0

  const active_group_ids = useMemo(() => {
    if (!has_groups_tree || active_group_id === ROOT_GROUP_ID) return null
    return new Set(collect_group_ids(value_groups, active_group_id))
  }, [has_groups_tree, active_group_id, value_groups])

  const scoped_items = useMemo(() => {
    if (!active_group_ids) return items
    return items.filter((it) => it.group && active_group_ids.has(it.group))
  }, [items, active_group_ids])

  const filtered_items = useMemo(() => {
    if (!search) return scoped_items
    const lowered = search.toLowerCase()
    return scoped_items.filter(
      (it) =>
        String(it.label || '')
          .toLowerCase()
          .includes(lowered) ||
        String(it.id || '')
          .toLowerCase()
          .includes(lowered)
    )
  }, [scoped_items, search])

  const should_search =
    show_search != null ? show_search : items.length > search_threshold

  const has_flat_groups = useMemo(() => {
    if (has_groups_tree) return false
    return items.some((it) => Boolean(it.group))
  }, [items, has_groups_tree])

  const flat_grouped_items = useMemo(() => {
    if (!has_flat_groups) return null
    const out = new Map()
    for (const it of filtered_items) {
      const g = it.group || 'Other'
      if (!out.has(g)) out.set(g, [])
      out.get(g).push(it)
    }
    return Array.from(out.entries())
  }, [filtered_items, has_flat_groups])

  const group_counts = useMemo(() => {
    if (!has_groups_tree) return {}
    const flat = flatten_groups(value_groups)
    const counts = {}
    counts[ROOT_GROUP_ID] = items.length
    for (const g of flat) {
      const descendants = new Set(collect_group_ids(value_groups, g.id))
      counts[g.id] = items.filter(
        (it) => it.group && descendants.has(it.group)
      ).length
    }
    return counts
  }, [has_groups_tree, value_groups, items])

  const selected_count = useMemo(
    () => items.filter((it) => it.selected).length,
    [items]
  )

  const render_item = (item) => {
    const indicator_class = get_string_from_object({
      'rt-spp-indicator': true,
      '-checkbox': is_multi,
      '-radio': !is_multi,
      '-checked': item.selected && !item.mixed,
      '-mixed': item.mixed
    })
    return (
      <div
        key={item.id}
        className={get_string_from_object({
          'rt-spp-item': true,
          [`-kind-${item.kind || 'value'}`]: true,
          '-selected': item.selected
        })}
        onClick={() => on_select && on_select(item)}>
        <span className={indicator_class}>
          {item.mixed ? (
            '–'
          ) : item.selected ? (
            <CheckIcon fontSize='inherit' />
          ) : null}
        </span>
        {render_icon(item.icon)}
        <span className='rt-spp-item-label'>{item.label}</span>
        {item.tag && <span className='rt-spp-item-tag'>{item.tag}</span>}
        {item.suffix && (
          <span className='rt-spp-item-suffix'>{item.suffix}</span>
        )}
      </div>
    )
  }

  const render_body = () => {
    if (filtered_items.length === 0)
      return <div className='rt-spp-empty'>No matches</div>
    if (has_flat_groups && flat_grouped_items) {
      return flat_grouped_items.map(([group_id, group_items]) => (
        <div key={group_id} className='rt-spp-group'>
          <div className='rt-spp-group-label'>
            {group_label_for_flat ? group_label_for_flat(group_id) : group_id}
          </div>
          {group_items.map(render_item)}
        </div>
      ))
    }
    return filtered_items.map(render_item)
  }

  const render_group_tree = () => {
    const flat = flatten_groups(value_groups)
    return (
      <div className='rt-spp-tree'>
        <div
          className={get_string_from_object({
            'rt-spp-tree-item': true,
            '-active': active_group_id === ROOT_GROUP_ID
          })}
          onClick={() => set_active_group_id(ROOT_GROUP_ID)}>
          <span className='rt-spp-tree-item-label'>All</span>
          <span className='rt-spp-tree-item-count'>
            {group_counts[ROOT_GROUP_ID] ?? 0}
          </span>
        </div>
        {flat.map((g) => (
          <div
            key={g.id}
            className={get_string_from_object({
              'rt-spp-tree-item': true,
              [`-depth-${g.depth}`]: true,
              '-active': active_group_id === g.id
            })}
            onClick={() => set_active_group_id(g.id)}>
            {render_icon(g.icon, 'rt-spp-icon -tree')}
            <span className='rt-spp-tree-item-label'>{g.label}</span>
            <span className='rt-spp-tree-item-count'>
              {group_counts[g.id] ?? 0}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const handle_select_all = () => {
    if (!on_select_all) return
    on_select_all(filtered_items)
  }

  const handle_clear = () => {
    if (on_clear) on_clear()
  }

  const show_head = (should_search || is_multi || on_close) && !is_single
  const count_label =
    selected_count_label != null
      ? selected_count_label
      : `${selected_count} selected`

  return (
    <div
      className={get_string_from_object({
        'rt-spp': true,
        '-two-pane': has_groups_tree,
        '-chromeless': chromeless
      })}
      style={!has_groups_tree && width ? { width } : undefined}>
      {has_groups_tree && render_group_tree()}
      <div className='rt-spp-right'>
        {show_head && (
          <div className='rt-spp-head'>
            {is_multi && (
              <div className='rt-spp-head-actions'>
                {on_select_all && (
                  <button
                    type='button'
                    className='rt-spp-head-action'
                    onClick={handle_select_all}>
                    {select_all_label}
                  </button>
                )}
                {on_clear && (
                  <button
                    type='button'
                    className='rt-spp-head-action'
                    onClick={handle_clear}>
                    {clear_label}
                  </button>
                )}
                <span className='rt-spp-head-count'>{count_label}</span>
                {on_close && (
                  <button
                    type='button'
                    className='rt-spp-head-action -close'
                    onClick={on_close}>
                    Close
                  </button>
                )}
              </div>
            )}
            {should_search && (
              <div className='rt-spp-search'>
                <SearchIcon
                  className='rt-spp-search-icon'
                  fontSize='small'
                  aria-hidden='true'
                />
                <input
                  type='text'
                  autoFocus
                  placeholder={search_placeholder}
                  value={search}
                  onChange={(e) => set_search(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
        <div className='rt-spp-body'>{render_body()}</div>
      </div>
    </div>
  )
}

SelectPickerPanel.propTypes = {
  items: PropTypes.array.isRequired,
  value_groups: PropTypes.array,
  is_multi: PropTypes.bool,
  is_single: PropTypes.bool,
  show_search: PropTypes.bool,
  search_threshold: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  on_select: PropTypes.func,
  on_select_all: PropTypes.func,
  on_clear: PropTypes.func,
  on_close: PropTypes.func,
  select_all_label: PropTypes.string,
  clear_label: PropTypes.string,
  selected_count_label: PropTypes.string,
  search_placeholder: PropTypes.string,
  group_label_for_flat: PropTypes.func,
  chromeless: PropTypes.bool
}
