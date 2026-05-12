import React from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'

function TagChip({ name, source, on_remove }) {
  return (
    <span
      className={get_string_from_object({
        'tvc-tag-chip': true,
        [`-${source}`]: true
      })}
      title={`Source: ${source}`}>
      <span className='tvc-tag-chip-name'>{name}</span>
      {on_remove && (
        <button
          className='tvc-tag-chip-remove'
          onClick={(e) => {
            e.stopPropagation()
            on_remove(name)
          }}
          aria-label={`Remove tag ${name}`}
          type='button'>
          &times;
        </button>
      )}
    </span>
  )
}

TagChip.propTypes = {
  name: PropTypes.string.isRequired,
  source: PropTypes.oneOf(['user', 'llm', 'auto']).isRequired,
  on_remove: PropTypes.func
}

export default TagChip
