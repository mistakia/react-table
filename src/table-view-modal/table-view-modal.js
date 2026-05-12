import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PropTypes from 'prop-types'
import React, { useState, useEffect, useCallback } from 'react'

import './table-view-modal.styl'

export default function TableViewModal({
  edit_view_modal_open,
  set_edit_view_modal_open,
  view,
  on_view_change
}) {
  const [view_name, set_view_name] = useState(view.view_name || '')
  const [view_description, set_view_description] = useState(
    view.view_description || ''
  )

  useEffect(() => {
    set_view_name(view.view_name || '')
    set_view_description(view.view_description || '')
  }, [view])

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

  return (
    <Dialog
      open={edit_view_modal_open}
      onClose={handle_close}
      className='table-view-modal'
      maxWidth='sm'
      fullWidth
      PaperProps={{ className: 'table-view-modal-paper' }}>
      <DialogTitle className='table-view-modal-title'>
        Edit view
        <IconButton
          aria-label='Close'
          onClick={handle_close}
          size='small'
          className='table-view-modal-close'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>
      <DialogContent className='table-view-modal-content' dividers>
        <TextField
          label='Name'
          variant='outlined'
          value={view_name}
          size='small'
          fullWidth
          autoFocus
          onChange={(e) => set_view_name(e.target.value)}
        />
        <TextField
          label='Description'
          variant='outlined'
          value={view_description}
          multiline
          minRows={3}
          maxRows={8}
          size='small'
          fullWidth
          onChange={(e) => set_view_description(e.target.value)}
        />
      </DialogContent>
      <DialogActions className='table-view-modal-actions'>
        <Button onClick={handle_close} color='inherit'>
          Cancel
        </Button>
        <Button
          onClick={handle_save_click}
          variant='contained'
          disableElevation>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

TableViewModal.propTypes = {
  edit_view_modal_open: PropTypes.bool.isRequired,
  set_edit_view_modal_open: PropTypes.func.isRequired,
  view: PropTypes.object.isRequired,
  on_view_change: PropTypes.func.isRequired
}
