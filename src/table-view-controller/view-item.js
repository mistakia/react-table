import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import { Popper } from '@mui/base/Popper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

import { generate_view_id, get_string_from_object } from '#src/utils'
import { use_confirm_click } from '#src/utils/use-confirm-click'
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
  handle_menu_toggle,
  on_toggle_favorite,
  is_favorited
}) {
  const { table_username } = useContext(table_context)
  const anchor_el = React.useRef()
  const [misc_menu_open, set_misc_menu_open] = React.useState(false)

  const handle_edit_click = () => {
    set_selected_edit_view(view)
    set_edit_view_modal_open(true)
  }

  const {
    is_confirming: is_remove_confirming,
    handle_click: handle_remove_click,
    reset: reset_remove_confirm
  } = use_confirm_click({
    on_confirm: () => {
      delete_view(view.view_id)
      set_misc_menu_open(false)
    }
  })

  React.useEffect(() => {
    if (!misc_menu_open) reset_remove_confirm()
  }, [misc_menu_open, reset_remove_confirm])

  const handle_select_click = () => {
    handle_select_view(view)
    set_misc_menu_open(false)
    handle_menu_toggle()
  }

  const handle_favorite_click = () => {
    if (on_toggle_favorite) on_toggle_favorite(view.view_id, is_favorited)
    set_misc_menu_open(false)
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

  const MAX_INLINE_TAGS = 6
  const all_tags = view.tags || []
  const visible_tags = all_tags.slice(0, MAX_INLINE_TAGS)
  const overflow_count = all_tags.length - visible_tags.length

  const is_selected = view.view_id === selected_view.view_id
  const has_no_username = !view.view_username
  const username_label = view.view_username || 'system'
  const username_initial = (username_label[0] || '?').toUpperCase()

  return (
    <div
      className={get_string_from_object({
        'table-view-item': true,
        '-selected': is_selected
      })}>
      <div className='table-view-item-left' onClick={handle_select_click}>
        <Tooltip
          title={has_no_username ? 'System view' : username_label}
          placement='top'
          enterDelay={700}>
          <div
            className={get_string_from_object({
              'table-view-item-username': true,
              '-placeholder': has_no_username
            })}>
            <span className='table-view-item-username-initial' aria-hidden='true'>
              {username_initial}
            </span>
            <span className='table-view-item-username-text'>
              {username_label}
            </span>
          </div>
        </Tooltip>
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
          {all_tags.length > 0 && (
            <div className='table-view-item-tags'>
              {visible_tags.map((tag) => (
                <TagChip
                  key={`${tag.source}-${tag.name}`}
                  name={tag.name}
                  source={tag.source}
                />
              ))}
              {overflow_count > 0 && (
                <span
                  className='tvc-tag-chip -overflow'
                  title={all_tags
                    .slice(MAX_INLINE_TAGS)
                    .map((t) => t.name)
                    .join(', ')}>
                  +{overflow_count}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className='table-view-item-actions'>
        {on_toggle_favorite && (
          <Tooltip
            title={is_favorited ? 'Remove from favorites' : 'Add to favorites'}
            placement='top'
            enterDelay={700}>
            <IconButton
              size='small'
              className={get_string_from_object({
                'table-view-item-favorite': true,
                '-active': is_favorited
              })}
              onClick={(e) => {
                e.stopPropagation()
                handle_favorite_click()
              }}>
              {is_favorited ? (
                <StarIcon fontSize='small' />
              ) : (
                <StarBorderIcon fontSize='small' />
              )}
            </IconButton>
          </Tooltip>
        )}
        {!disable_edit_view && (
          <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
            <div>
              <IconButton
                ref={anchor_el}
                size='small'
                className='table-view-item-more'
                aria-label='View actions'
                onClick={(e) => {
                  e.stopPropagation()
                  set_misc_menu_open(!misc_menu_open)
                }}>
                <MoreHorizIcon fontSize='small' />
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
                        className={get_string_from_object({
                          'misc-menu-item': true,
                          '-destructive': true,
                          '-confirming': is_remove_confirming
                        })}
                        onClick={handle_remove_click}>
                        <div className='misc-menu-item-icon'>
                          <DeleteIcon size='small' />
                        </div>
                        <div className='misc-menu-item-text'>
                          {is_remove_confirming
                            ? 'Click again to confirm'
                            : 'Remove'}
                        </div>
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
        )}
      </div>
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
  handle_menu_toggle: PropTypes.func.isRequired,
  on_toggle_favorite: PropTypes.func,
  is_favorited: PropTypes.bool
}

export default ViewItem
