import React from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'
import TagChip from './tag-chip'

const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'shared', label: 'Shared' },
  { id: 'system', label: 'System' }
]

function ViewOrganizationRail({
  active_section,
  on_section_change,
  counts,
  all_tags,
  active_tag_filters,
  on_toggle_tag_filter
}) {
  const total_count = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <div className='tvc-rail'>
      <div className='tvc-rail-sections'>
        {SECTIONS.map(({ id, label }) => {
          const count = id === 'all' ? total_count : counts[id] || 0
          if (id !== 'all' && count === 0) return null
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
          {all_tags.map(({ name, source }) => (
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
  on_toggle_tag_filter: PropTypes.func
}

ViewOrganizationRail.defaultProps = {
  counts: {},
  all_tags: []
}

export default ViewOrganizationRail
