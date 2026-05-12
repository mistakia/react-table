import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import { distance } from 'fastest-levenshtein'

import { fuzzy_match, debounce } from '#src/utils'

import './column-picker.styl'

export default function ColumnPicker({
  open,
  anchor_el,
  all_columns,
  on_select,
  on_close
}) {
  const [filter_text, set_filter_text] = useState('')
  const [filtered_columns, set_filtered_columns] = useState(all_columns)

  const debounced_filter = useCallback(
    debounce((filter) => {
      const filtered = all_columns
        .filter((col) =>
          fuzzy_match(filter, col.column_title || col.column_id)
        )
        .sort(
          (a, b) =>
            distance(filter, a.column_title || a.column_id) -
            distance(filter, b.column_title || b.column_id)
        )
      set_filtered_columns(filtered)
    }, 100),
    [all_columns]
  )

  useEffect(() => {
    if (!filter_text) {
      set_filtered_columns(all_columns)
      return
    }
    debounced_filter(filter_text)
  }, [filter_text, all_columns, debounced_filter])

  useEffect(() => {
    if (!open) set_filter_text('')
  }, [open])

  const handle_select = (column) => {
    on_select(column)
    set_filter_text('')
  }

  return (
    <Popper
      className='table-popper'
      open={open}
      anchorEl={anchor_el}
      placement='bottom-start'>
      <ClickAwayListener onClickAway={on_close}>
        <div className='column-select-menu rt-popper-surface'>
          <div className='rt-search-input'>
            <TextField
              variant='outlined'
              size='small'
              margin='none'
              fullWidth
              label='Search columns'
              autoComplete='off'
              autoFocus
              value={filter_text}
              onChange={(event) => set_filter_text(event.target.value)}
            />
          </div>
          <div className='column-select-list'>
            <MenuList>
              {filtered_columns.map((col) => (
                <MenuItem
                  key={col.column_id}
                  onClick={() => handle_select(col)}>
                  {col.column_title || col.column_id}
                </MenuItem>
              ))}
            </MenuList>
          </div>
        </div>
      </ClickAwayListener>
    </Popper>
  )
}

ColumnPicker.propTypes = {
  open: PropTypes.bool.isRequired,
  anchor_el: PropTypes.any,
  all_columns: PropTypes.array.isRequired,
  on_select: PropTypes.func.isRequired,
  on_close: PropTypes.func.isRequired
}
