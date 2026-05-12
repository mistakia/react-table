import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import { Popper } from '@mui/base/Popper'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'

import { generate_view_id, get_string_from_object } from '#src/utils'
import { table_context } from '#src/table-context'
import TagChip from './tag-chip'

function ViewItem({
  view,
  handle_select_view,
  set_selected_edit_view,
  set_edit_view_modal_open,
  delete_view,
  on_view_change,
  disable_edit_view,
  selected_view,
  handle_menu_toggle
}) {
  const { table_username } = useContext(table_context)
  const anchor_el = React.useRef()
  const [misc_menu_open, set_misc_menu_open] = React.useState(false)

  const handle_edit_click = () => {
    set_selected_edit_view(view)
    set_edit_view_modal_open(true)
  }

  const handle_remove_click = () => {
    delete_view(view.view_id)
    set_misc_menu_open(false)
  }

  const handle_select_click = () => {
    handle_select_view(view)
    set_misc_menu_open(false)
    handle_menu_toggle()
  }

  const handle_duplicate_click = () => {
    on_view_change(
      {
        view_id: generate_view_id(),
        view_name: `${view.view_name} (copy)`,
        view_username: table_username || 'system',
        view_description: view.view_description,
        table_state: view.table_state
      },
      {
        view_state_changed: true,
        is_new_view: true
      }
    )
    set_misc_menu_open(false)
  }

  const tags = view.tags || []

  return (
    <div
      className={get_string_from_object({
        'table-view-item': true,
        '-selected': view.view_id === selected_view.view_id
      })}>
      <div className='table-view-item-left' onClick={handle_select_click}>
        <div className='table-view-item-username'>{view.view_username}</div>
        <div className='table-view-item-info-container'>
          <div className='table-view-item-name'>
            {view.view_name}
            {Boolean(view.has_unsaved_local_edits) && (
              <span
                className='table-view-item-unsaved-dot'
                title='Unsaved local edits'
              />
            )}
          </div>
          {view.view_description && (
            <div className='table-view-item-description'>
              {view.view_description}
            </div>
          )}
          {tags.length > 0 && (
            <div className='table-view-item-tags'>
              {tags.map((tag) => (
                <TagChip
                  key={`${tag.source}-${tag.name}`}
                  name={tag.name}
                  source={tag.source}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {!disable_edit_view && (
        <div className='table-view-item-right'>
          <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
            <div>
              <IconButton
                ref={anchor_el}
                onClick={(e) => {
                  e.stopPropagation()
                  set_misc_menu_open(!misc_menu_open)
                }}>
                <MoreHorizIcon />
              </IconButton>
              <Popper
                className='misc-menu table-popper'
                open={misc_menu_open}
                anchorEl={anchor_el.current}
                placement='bottom-start'>
                <div>
                  {Boolean(view.is_editable) && (
                    <>
                      <div
                        className='misc-menu-item'
                        onClick={handle_edit_click}>
                        <div className='misc-menu-item-icon'>
                          <EditIcon size='small' />
                        </div>
                        <div className='misc-menu-item-text'>Edit</div>
                      </div>
                      <div
                        className='misc-menu-item'
                        onClick={handle_remove_click}>
                        <div className='misc-menu-item-icon'>
                          <DeleteIcon size='small' />
                        </div>
                        <div className='misc-menu-item-text'>Remove</div>
                      </div>
                    </>
                  )}
                  <div
                    className='misc-menu-item'
                    onClick={handle_duplicate_click}>
                    <div className='misc-menu-item-icon'>
                      <ContentCopyIcon size='small' />
                    </div>
                    <div className='misc-menu-item-text'>Duplicate</div>
                  </div>
                </div>
              </Popper>
            </div>
          </ClickAwayListener>
        </div>
      )}
    </div>
  )
}

ViewItem.propTypes = {
  view: PropTypes.object.isRequired,
  handle_select_view: PropTypes.func.isRequired,
  set_selected_edit_view: PropTypes.func.isRequired,
  set_edit_view_modal_open: PropTypes.func.isRequired,
  delete_view: PropTypes.func.isRequired,
  on_view_change: PropTypes.func.isRequired,
  disable_edit_view: PropTypes.bool,
  selected_view: PropTypes.object.isRequired,
  handle_menu_toggle: PropTypes.func.isRequired
}

export default ViewItem
