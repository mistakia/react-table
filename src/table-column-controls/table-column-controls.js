import React from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Modal from '@mui/material/Modal'
import IconButton from '@mui/material/IconButton'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'

import DataTypeIcon from '../data-type-icon'
import { fuzzy_match } from '../utils'

import './table-column-controls.styl'

export default function TableColumnControls({
  table_state,
  all_columns,
  set_column_visible,
  set_column_hidden,
  set_all_columns_hidden,
  column_controls_popper_open,
  set_column_controls_popper_open
}) {
  const [filter_text_input, set_filter_text_input] = React.useState('')

  const shown_columns_index = {}
  const shown_column_items = []
  const hidden_column_items = []

  for (const column of table_state.columns || []) {
    if (
      filter_text_input &&
      !fuzzy_match(filter_text_input, column.accessorKey)
    ) {
      continue
    }

    shown_columns_index[column.accessorKey] = true
    shown_column_items.push(
      <div key={column.accessorKey} className='column-item'>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>{column.header_label}</div>
        <IconButton
          className='column-action'
          onClick={() => set_column_hidden(column.accessorKey)}>
          <VisibilityOffIcon />
        </IconButton>
      </div>
    )
  }

  for (const column of all_columns) {
    if (shown_columns_index[column.column_name]) continue

    if (
      filter_text_input &&
      !fuzzy_match(filter_text_input, column.accessorKey)
    ) {
      continue
    }

    hidden_column_items.push(
      <div key={column.column_name} className='column-item'>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>{column.column_name}</div>
        <IconButton
          className='column-action'
          onClick={() => set_column_visible(column)}>
          <VisibilityIcon />
        </IconButton>
      </div>
    )
  }

  const handle_on_close = () => {
    set_column_controls_popper_open(false)
    set_filter_text_input('')
  }

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={() =>
          set_column_controls_popper_open(!column_controls_popper_open)
        }>
        <ViewColumnIcon />
        Columns
      </Button>
      <Modal
        open={column_controls_popper_open}
        onClose={handle_on_close}
        placement='bottom'>
        <div className='table-column-controls'>
          <div className='filter-input'>
            <TextField
              id='outlined-basic'
              label='Filter columns'
              placeholder='Search for a column'
              variant='outlined'
              size='small'
              value={filter_text_input}
              onChange={(e) => set_filter_text_input(e.target.value)}
              fullWidth
              autoFocus
            />
          </div>
          <div className='section-header'>
            <div style={{ display: 'flex', alignSelf: 'center' }}>
              Shown in table
            </div>
            <div>
              <div className='action' onClick={() => set_all_columns_hidden()}>
                Hide all
              </div>
            </div>
          </div>
          {shown_column_items}
          <div className='section-header'>
            <div style={{ display: 'flex', alignSelf: 'center' }}>
              Hidden in table
            </div>
          </div>
          {hidden_column_items}
        </div>
      </Modal>
    </>
  )
}

TableColumnControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.array,
  set_column_visible: PropTypes.func,
  set_column_hidden: PropTypes.func,
  set_all_columns_hidden: PropTypes.func,
  column_controls_popper_open: PropTypes.bool,
  set_column_controls_popper_open: PropTypes.func
}
