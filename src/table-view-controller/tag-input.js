import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'

function TagInput({
  suggestions,
  existing_tag_names,
  on_submit,
  on_remove,
  placeholder
}) {
  const [open, set_open] = useState(false)
  const [query, set_query] = useState('')
  const [focused_index, set_focused_index] = useState(0)
  const [position, set_position] = useState({ top: 0, left: 0 })
  const anchor_ref = useRef(null)
  const search_ref = useRef(null)
  const dropdown_ref = useRef(null)

  const selected = useMemo(
    () => new Set(existing_tag_names || []),
    [existing_tag_names]
  )

  const matches = suggestions.filter(
    (s) => !query || s.toLowerCase().includes(query.toLowerCase())
  )
  const trimmed = query.trim()
  const can_create = Boolean(
    trimmed && !suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase())
  )
  const total_options = matches.length + (can_create ? 1 : 0)

  useEffect(() => {
    if (open && anchor_ref.current) {
      const rect = anchor_ref.current.getBoundingClientRect()
      set_position({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
      set_query('')
      set_focused_index(0)
    }
  }, [open])

  useEffect(() => {
    if (open && search_ref.current) search_ref.current.focus()
  }, [open])

  useEffect(() => {
    set_focused_index(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handle_outside = (e) => {
      if (
        dropdown_ref.current &&
        !dropdown_ref.current.contains(e.target) &&
        anchor_ref.current &&
        !anchor_ref.current.contains(e.target)
      ) {
        set_open(false)
      }
    }
    document.addEventListener('mousedown', handle_outside)
    return () => document.removeEventListener('mousedown', handle_outside)
  }, [open])

  const toggle_tag = useCallback(
    (name) => {
      if (selected.has(name)) {
        on_remove && on_remove(name)
      } else {
        on_submit(name)
      }
    },
    [selected, on_submit, on_remove]
  )

  const handle_keydown = useCallback(
    (e) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        set_open(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        set_focused_index((p) => (p < total_options - 1 ? p + 1 : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        set_focused_index((p) => (p > 0 ? p - 1 : total_options - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (focused_index < matches.length) {
          toggle_tag(matches[focused_index])
        } else if (can_create) {
          on_submit(trimmed)
          set_query('')
        }
      }
    },
    [open, total_options, focused_index, matches, can_create, trimmed, toggle_tag, on_submit]
  )

  const dropdown = open
    ? ReactDOM.createPortal(
        <div
          ref={dropdown_ref}
          className='tvc-tag-picker-dropdown'
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}>
          <div className='tvc-tag-picker-search'>
            <input
              ref={search_ref}
              className='tvc-tag-picker-search-input'
              type='text'
              value={query}
              placeholder='Search or create tag...'
              autoComplete='off'
              onChange={(e) => set_query(e.target.value)}
              onKeyDown={handle_keydown}
            />
          </div>
          <div className='tvc-tag-picker-list'>
            {matches.length === 0 && !can_create && (
              <div className='tvc-tag-picker-empty'>No tags</div>
            )}
            {matches.map((name, index) => {
              const is_selected = selected.has(name)
              return (
                <div
                  key={name}
                  className={get_string_from_object({
                    'tvc-tag-picker-option': true,
                    '-focused': index === focused_index
                  })}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    toggle_tag(name)
                  }}>
                  <span className='tvc-tag-picker-check'>
                    {is_selected ? '✓' : ''}
                  </span>
                  <span>{name}</span>
                </div>
              )
            })}
            {can_create && (
              <div
                className={get_string_from_object({
                  'tvc-tag-picker-option': true,
                  '-create': true,
                  '-focused': focused_index === matches.length
                })}
                onMouseDown={(e) => {
                  e.preventDefault()
                  on_submit(trimmed)
                  set_query('')
                }}>
                <span className='tvc-tag-picker-check'>+</span>
                <span>Create &ldquo;{trimmed}&rdquo;</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <span
        ref={anchor_ref}
        className='tvc-tag-add-chip'
        onClick={(e) => {
          e.stopPropagation()
          set_open((v) => !v)
        }}>
        + {placeholder || 'Add tag'}
      </span>
      {dropdown}
    </>
  )
}

TagInput.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string),
  existing_tag_names: PropTypes.arrayOf(PropTypes.string),
  on_submit: PropTypes.func.isRequired,
  on_remove: PropTypes.func,
  placeholder: PropTypes.string
}

TagInput.defaultProps = {
  suggestions: [],
  existing_tag_names: []
}

export default TagInput
