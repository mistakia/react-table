import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import PropTypes from 'prop-types'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import TagChip from '#src/table-view-controller/tag-chip'
import TagInput from '#src/table-view-controller/tag-input'
import { get_all_tags } from '#src/table-view-controller/use-organized-views'

import './table-view-modal.styl'

export default function TableViewModal({
  edit_view_modal_open,
  set_edit_view_modal_open,
  view,
  on_view_change,
  tags_by_view_id,
  auto_tags_map,
  tag_suggestions,
  can_edit_tags,
  on_add_user_tag,
  on_remove_user_tag
}) {
  const [view_name, set_view_name] = useState(view.view_name || '')
  const [view_description, set_view_description] = useState(
    view.view_description || ''
  )
  const name_ref = useRef(null)

  useEffect(() => {
    set_view_name(view.view_name || '')
    set_view_description(view.view_description || '')
  }, [view])

  useEffect(() => {
    if (edit_view_modal_open && name_ref.current) {
      requestAnimationFrame(() => name_ref.current && name_ref.current.focus())
    }
  }, [edit_view_modal_open])

  const current_tags = useMemo(() => {
    if (!view || !view.view_id) return []
    return get_all_tags(view, tags_by_view_id, auto_tags_map)
  }, [view, tags_by_view_id, auto_tags_map])

  const handle_close = useCallback(
    () => set_edit_view_modal_open(false),
    [set_edit_view_modal_open]
  )

  const handle_save_click = useCallback(() => {
    on_view_change(
      { ...view, view_name, view_description },
      { view_state_changed: false, view_metadata_changed: true }
    )
    set_edit_view_modal_open(false)
  }, [
    view,
    view_name,
    view_description,
    on_view_change,
    set_edit_view_modal_open
  ])

  const handle_key_down = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handle_save_click()
    }
  }

  const show_tags_section = current_tags.length > 0 || can_edit_tags

  return (
    <Dialog
      open={edit_view_modal_open}
      onClose={handle_close}
      className='table-view-modal'
      maxWidth='sm'
      fullWidth
      PaperProps={{ className: 'table-view-modal-paper' }}>
      <div className='tvm-frame' onKeyDown={handle_key_down}>
        <div className='tvm-header'>
          <span className='tvm-header-label'>Edit view</span>
          <IconButton
            aria-label='Close'
            onClick={handle_close}
            size='small'
            className='tvm-close'>
            <CloseIcon fontSize='small' />
          </IconButton>
        </div>

        <div className='tvm-body'>
          <label className='tvm-field'>
            <span className='tvm-label'>Name</span>
            <input
              ref={name_ref}
              type='text'
              className='tvm-input'
              value={view_name}
              spellCheck='false'
              autoComplete='off'
              onChange={(e) => set_view_name(e.target.value)}
            />
          </label>

          <label className='tvm-field'>
            <span className='tvm-label'>Description</span>
            <textarea
              className='tvm-textarea'
              value={view_description}
              rows={5}
              spellCheck='false'
              onChange={(e) => set_view_description(e.target.value)}
            />
          </label>

          {show_tags_section && (
            <div className='tvm-field'>
              <span className='tvm-label'>Tags</span>
              <div className='tvm-tags'>
                {current_tags.map((tag) => (
                  <TagChip
                    key={`${tag.source}-${tag.name}`}
                    name={tag.name}
                    source={tag.source}
                    on_remove={
                      can_edit_tags && tag.source === 'user'
                        ? () => on_remove_user_tag(view.view_id, tag.name)
                        : undefined
                    }
                  />
                ))}
                {can_edit_tags && (
                  <TagInput
                    suggestions={tag_suggestions || []}
                    existing_tag_names={current_tags
                      .filter((t) => t.source === 'user')
                      .map((t) => t.name)}
                    on_submit={(name) => on_add_user_tag(view.view_id, name)}
                    on_remove={(name) =>
                      on_remove_user_tag(view.view_id, name)
                    }
                    placeholder='Add tag'
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className='tvm-footer'>
          <div className='tvm-hint'>
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span>to save</span>
          </div>
          <div className='tvm-actions'>
            <button
              type='button'
              className='tvm-button -ghost'
              onClick={handle_close}>
              Cancel
            </button>
            <button
              type='button'
              className='tvm-button -primary'
              onClick={handle_save_click}>
              Save
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

TableViewModal.propTypes = {
  edit_view_modal_open: PropTypes.bool.isRequired,
  set_edit_view_modal_open: PropTypes.func.isRequired,
  view: PropTypes.object.isRequired,
  on_view_change: PropTypes.func.isRequired,
  tags_by_view_id: PropTypes.object,
  auto_tags_map: PropTypes.object,
  tag_suggestions: PropTypes.arrayOf(PropTypes.string),
  can_edit_tags: PropTypes.bool,
  on_add_user_tag: PropTypes.func,
  on_remove_user_tag: PropTypes.func
}
