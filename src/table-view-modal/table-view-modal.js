import { Modal } from '@mui/material'
import PropTypes from 'prop-types'
import React from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import './table-view-modal.styl'

export default function TableViewModal({
  edit_view_modal_open,
  set_edit_view_modal_open,
  view,
  on_view_change
}) {
  const [view_name, set_view_name] = React.useState(view.view_name || '')
  const [view_description, set_view_description] = React.useState(
    view.view_description || ''
  )

  React.useEffect(() => {
    set_view_name(view.view_name || '')
    set_view_description(view.view_description || '')
  }, [view])

  const handle_view_name_change = (event) => {
    set_view_name(event.target.value)
  }

  const handle_view_description_change = (event) => {
    set_view_description(event.target.value)
  }

  const handle_save_click = () => {
    on_view_change({
      ...view,
      view_name,
      view_description
    })
    set_edit_view_modal_open(false)
  }

  return (
    <Modal
      open={edit_view_modal_open}
      onClose={() => set_edit_view_modal_open(false)}
      className='table-view-modal'>
      <div className='table-view-modal-content'>
        <div className='table-view-item-content-name'>
          <TextField
            label='View name'
            variant='filled'
            value={view_name}
            size='small'
            onChange={handle_view_name_change}
          />
        </div>
        <div className='table-view-item-content-description'>
          <TextField
            label='View description'
            variant='filled'
            value={view_description}
            multiline
            size='small'
            onChange={handle_view_description_change}
          />
        </div>
        <div className='table-view-modal-actions'>
          <Button onClick={() => set_edit_view_modal_open(false)}>
            Cancel
          </Button>
          <Button onClick={handle_save_click}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}

TableViewModal.propTypes = {
  edit_view_modal_open: PropTypes.bool.isRequired,
  set_edit_view_modal_open: PropTypes.func.isRequired,
  view: PropTypes.object.isRequired,
  on_view_change: PropTypes.func.isRequired
}
