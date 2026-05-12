import React from 'react'
import PropTypes from 'prop-types'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

function CurrentViewHeader({
  view,
  is_favorited,
  is_table_state_changed,
  on_toggle_favorite,
  on_save_current_view,
  on_reset_current_view,
  on_edit,
  on_duplicate
}) {
  if (!view) return null

  const { view_name, view_description, view_username, has_unsaved_local_edits, is_editable } = view

  const can_save = is_table_state_changed && is_editable
  const save_tooltip = is_editable
    ? 'Save current view'
    : 'Duplicate this view to save your changes'

  return (
    <div className='tvc-current-view-header'>
      <div className='tvc-current-view-header-main'>
        <div className='tvc-current-view-header-meta'>
          {view_username && (
            <span className='tvc-current-view-header-username'>
              {view_username}
            </span>
          )}
          <span className='tvc-current-view-header-name'>
            {view_name}
            {Boolean(has_unsaved_local_edits) && (
              <span
                className='tvc-current-view-unsaved-dot'
                title='Unsaved local edits'
              />
            )}
          </span>
          {view_description && (
            <span className='tvc-current-view-header-description'>
              {view_description}
            </span>
          )}
        </div>

        <div className='tvc-current-view-header-actions'>
          {on_toggle_favorite && (
            <Tooltip
              title={is_favorited ? 'Remove from favorites' : 'Add to favorites'}
              placement='top'
              enterDelay={700}>
              <IconButton
                size='small'
                onClick={() => on_toggle_favorite(view.view_id)}
                className={is_favorited ? '-active' : ''}>
                {is_favorited ? (
                  <StarIcon fontSize='small' />
                ) : (
                  <StarBorderIcon fontSize='small' />
                )}
              </IconButton>
            </Tooltip>
          )}

          {(on_save_current_view || on_reset_current_view) && (
            <>
              {on_reset_current_view && (
                <Tooltip title='Reset to saved state' placement='top' enterDelay={700}>
                  <span>
                    <IconButton
                      size='small'
                      onClick={on_reset_current_view}
                      disabled={!is_table_state_changed}>
                      <UndoIcon fontSize='small' />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {on_save_current_view && (
                <Tooltip title={save_tooltip} placement='top' enterDelay={700}>
                  <span>
                    <IconButton
                      size='small'
                      onClick={on_save_current_view}
                      disabled={!can_save}>
                      <SaveIcon fontSize='small' />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </>
          )}

          {on_edit && is_editable && (
            <Tooltip title='Edit view details' placement='top' enterDelay={700}>
              <IconButton size='small' onClick={() => on_edit(view)}>
                <EditIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}

          {on_duplicate && (
            <Tooltip title='Duplicate view' placement='top' enterDelay={700}>
              <IconButton size='small' onClick={() => on_duplicate(view)}>
                <ContentCopyIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

CurrentViewHeader.propTypes = {
  view: PropTypes.object,
  is_favorited: PropTypes.bool,
  is_table_state_changed: PropTypes.bool,
  on_toggle_favorite: PropTypes.func,
  on_save_current_view: PropTypes.func,
  on_reset_current_view: PropTypes.func,
  on_edit: PropTypes.func,
  on_duplicate: PropTypes.func
}

export default CurrentViewHeader
