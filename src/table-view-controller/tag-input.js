import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'

function TagInput({ suggestions, on_submit, placeholder }) {
  const [value, set_value] = useState('')
  const [show_suggestions, set_show_suggestions] = useState(false)
  const input_ref = useRef(null)

  const filtered_suggestions = value
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
      )
    : []

  const handle_change = (e) => {
    set_value(e.target.value)
    set_show_suggestions(true)
  }

  const handle_key_down = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      submit(value.trim())
    } else if (e.key === 'Escape') {
      set_show_suggestions(false)
    }
  }

  const submit = (tag_name) => {
    on_submit(tag_name)
    set_value('')
    set_show_suggestions(false)
  }

  const handle_suggestion_click = (suggestion) => {
    submit(suggestion)
    input_ref.current && input_ref.current.focus()
  }

  const handle_blur = () => {
    setTimeout(() => set_show_suggestions(false), 150)
  }

  return (
    <div className='tvc-tag-input-container'>
      <input
        ref={input_ref}
        className='tvc-tag-input'
        type='text'
        value={value}
        onChange={handle_change}
        onKeyDown={handle_key_down}
        onFocus={() => value && set_show_suggestions(true)}
        onBlur={handle_blur}
        placeholder={placeholder || 'Add tag...'}
        autoComplete='off'
      />
      {show_suggestions && filtered_suggestions.length > 0 && (
        <ul className='tvc-tag-input-suggestions'>
          {filtered_suggestions.slice(0, 8).map((s) => (
            <li
              key={s}
              className='tvc-tag-input-suggestion'
              onMouseDown={() => handle_suggestion_click(s)}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

TagInput.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string),
  on_submit: PropTypes.func.isRequired,
  placeholder: PropTypes.string
}

TagInput.defaultProps = {
  suggestions: []
}

export default TagInput
