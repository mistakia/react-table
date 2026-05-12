import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'
import TagChip from './tag-chip'

const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'shared', label: 'Shared' },
  { id: 'system', label: 'System' },
  { id: 'authors', label: 'By author' }
]

function ViewOrganizationRail({
  active_section,
  on_section_change,
  counts,
  all_tags,
  active_tag_filters,
  on_toggle_tag_filter,
  on_clear_tag_filters
}) {
  const has_active_filters = Boolean(
    active_tag_filters && active_tag_filters.size > 0
  )
  const total_count = Object.values(counts).reduce((sum, n) => sum + n, 0)

  const [tag_query, set_tag_query] = useState('')
  const normalized_query = tag_query.trim().toLowerCase()
  const visible_tags = normalized_query
    ? all_tags.filter(
        ({ name }) =>
          name.toLowerCase().includes(normalized_query) ||
          (active_tag_filters && active_tag_filters.has(name))
      )
    : all_tags

  return (
    <div className='tvc-rail'>
      <div className='tvc-rail-sections'>
        {SECTIONS.map(({ id, label }) => {
          const count =
            id === 'all' || id === 'authors'
              ? total_count
              : counts[id] || 0
          if (id !== 'all' && id !== 'authors' && count === 0) return null
          return (
            <button
              key={id}
              type='button'
              className={get_string_from_object({
                'tvc-rail-section': true,
                '-active': active_section === id
              })}
              onClick={() => on_section_change(id)}>
              <span className='tvc-rail-section-label'>{label}</span>
              <span className='tvc-rail-section-count'>{count}</span>
            </button>
          )
        })}
      </div>

      {all_tags && all_tags.length > 0 && (
        <div className='tvc-rail-tags'>
          <div className='tvc-rail-tags-controls'>
            <input
              type='text'
              className='tvc-rail-tags-search'
              placeholder='Filter tags'
              value={tag_query}
              onChange={(e) => set_tag_query(e.target.value)}
              autoComplete='off'
            />
            {has_active_filters && (
              <button
                type='button'
                className='tvc-rail-tags-clear'
                onClick={on_clear_tag_filters}>
                Clear ({active_tag_filters.size})
              </button>
            )}
          </div>
          {visible_tags.length === 0 && (
            <div className='tvc-rail-tags-empty'>No tags match</div>
          )}
          {visible_tags.map(({ name, source }) => (
            <button
              key={`${source}:${name}`}
              type='button'
              className={get_string_from_object({
                'tvc-rail-tag-filter': true,
                '-active': active_tag_filters && active_tag_filters.has(name)
              })}
              onClick={() => on_toggle_tag_filter && on_toggle_tag_filter(name)}
              title={`Filter by tag: ${name} (${source})`}>
              <TagChip name={name} source={source} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

ViewOrganizationRail.propTypes = {
  active_section: PropTypes.string.isRequired,
  on_section_change: PropTypes.func.isRequired,
  counts: PropTypes.shape({
    mine: PropTypes.number,
    favorites: PropTypes.number,
    shared: PropTypes.number,
    system: PropTypes.number
  }),
  all_tags: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      source: PropTypes.oneOf(['user', 'llm', 'auto']).isRequired
    })
  ),
  active_tag_filters: PropTypes.instanceOf(Set),
  on_toggle_tag_filter: PropTypes.func,
  on_clear_tag_filters: PropTypes.func
}

ViewOrganizationRail.defaultProps = {
  counts: {},
  all_tags: []
}

export default ViewOrganizationRail
