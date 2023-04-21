import React from 'react'
import PropTypes from 'prop-types'
import Modal from '@mui/material/Modal'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import IconButton from '@mui/material/IconButton'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import PopperUnstyled from '@mui/base/PopperUnstyled'
import ClickAwayListener from '@mui/material/ClickAwayListener'
// import ListIcon from '@mui/icons-material/List'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

import { debounce } from '../utils'

import './table-filter-modal.styl'

function FilterItem({
  where_item,
  all_columns,
  index,
  table_state,
  on_table_state_change
}) {
  const anchor_el = React.useRef()
  const [filter_column, set_filter_column] = React.useState(
    all_columns.find((column) => column.column_name === where_item.column_name)
  )
  const [filter_value, set_filter_value] = React.useState(where_item.value)
  const [misc_menu_open, set_misc_menu_open] = React.useState(false)

  React.useEffect(() => {
    return () => {
      set_misc_menu_open(false)
    }
  }, [])

  const handle_remove_click = () => {
    const where_param = table_state.where || []
    delete where_param[index]
    on_table_state_change({
      ...table_state,
      where: where_param
    })
    set_misc_menu_open(false)
  }

  const handle_duplicate_click = () => {
    const where_param = table_state.where || []
    where_param.push(where_item)
    on_table_state_change({
      ...table_state,
      where: where_param
    })
    set_misc_menu_open(false)
  }

  const handle_operator_change = (event) => {
    const where_param = table_state.where || []
    where_param[index].operator = event.target.value
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }

  const handle_column_change = (event, value) => {
    set_filter_column(value)

    if (!value) {
      return
    }

    const where_param = table_state.where || []
    where_param[index].column_name = value.column_name
    where_param[index].table_name = value.table_name
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }

  const handle_value_change_debounced = debounce((event) => {
    const where_param = table_state.where || []
    where_param[index].value = event.target.value
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }, 3000)

  const handle_value_change = (event) => {
    set_filter_value(event.target.value)
    handle_value_change_debounced(event)
  }

  const show_value = () => {
    if (
      where_item.operator === 'IS NULL' ||
      where_item.operator === 'IS NOT NULL'
    ) {
      return false
    }

    return true
  }

  return (
    <div className='filter-item'>
      <div className='filter-item-left'>
        <div className='filter-item-left-column'>
          <Autocomplete
            size='small'
            options={all_columns}
            value={filter_column}
            onChange={handle_column_change}
            getOptionLabel={(option) => option.column_name}
            isOptionEqualToValue={(option, value) =>
              option.column_name === value.column_name
            }
            renderInput={(params) => (
              <TextField {...params} label='Column' variant='outlined' />
            )}
          />
        </div>
        <div className='filter-item-left-operator'>
          <FormControl>
            <InputLabel id='operator-label'>Operator</InputLabel>
            <Select
              size='small'
              value={where_item.operator}
              onChange={handle_operator_change}
              label='Operator'
              labelId='operator-label'
              variant='outlined'>
              <MenuItem value='='>Equal to</MenuItem>
              <MenuItem value='!='>Not equal to</MenuItem>
              <MenuItem value='>'>Greater than</MenuItem>
              <MenuItem value='>='>Greater than or equal</MenuItem>
              <MenuItem value='<'>Less than</MenuItem>
              <MenuItem value='<='>Less than or equal</MenuItem>
              <MenuItem value='LIKE'>Like</MenuItem>
              <MenuItem value='NOT LIKE'>Not like</MenuItem>
              <MenuItem value='IN'>In</MenuItem>
              <MenuItem value='NOT IN'>Not in</MenuItem>
              <MenuItem value='IS NULL'>Is empty</MenuItem>
              <MenuItem value='IS NOT NULL'>Is not empty</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div className='filter-item-left-value'>
          <TextField
            size='small'
            label='Value'
            variant='outlined'
            disabled={!show_value()}
            value={filter_value}
            onChange={handle_value_change}
          />
        </div>
      </div>
      <div className='filter-item-right'>
        <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
          <div>
            <IconButton
              className='filter-item-right-action'
              ref={anchor_el}
              onClick={() => set_misc_menu_open(!misc_menu_open)}>
              <MoreHorizIcon />
            </IconButton>
            <PopperUnstyled
              className='misc-menu'
              open={misc_menu_open}
              anchorEl={anchor_el.current}
              placement='bottom-start'>
              <div>
                <div className='misc-menu-item' onClick={handle_remove_click}>
                  <div className='misc-menu-item-icon'>
                    <DeleteIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Remove</div>
                </div>
                <div
                  className='misc-menu-item'
                  onClick={handle_duplicate_click}>
                  <div className='misc-menu-item-icon'>
                    <ContentCopyIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Duplicate</div>
                </div>
                {/* <div className='misc-menu-item'>
                  <div className='misc-menu-item-icon'>
                    <ListIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Turn into group</div>
                </div> */}
              </div>
            </PopperUnstyled>
          </div>
        </ClickAwayListener>
      </div>
    </div>
  )
}

FilterItem.propTypes = {
  all_columns: PropTypes.array.isRequired,
  where_item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}

export default function TableFilterModal({
  filter_modal_open,
  set_filter_modal_open,
  table_state,
  on_table_state_change,
  all_columns
}) {
  const items = []
  const where_param = table_state.where || []
  where_param.forEach((where_item, index) => {
    items.push(
      <FilterItem
        key={index}
        {...{
          all_columns,
          where_item,
          index,
          table_state,
          on_table_state_change
        }}
      />
    )
  })

  const handle_add_click = () => {
    where_param.push({
      column: all_columns[0].column_name,
      operator: '=',
      value: ''
    })
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }

  return (
    <Modal
      open={filter_modal_open}
      keepMounted={true}
      onClose={() => set_filter_modal_open(false)}
      className='table-filter-modal'>
      <div className='table-filter-modal-content'>
        {items}
        <div className='table-filter-add-content'>
          <div className='table-filter-add-button' onClick={handle_add_click}>
            <AddIcon />
            <div className='table-filter-add-content-text'>Add filter</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

TableFilterModal.propTypes = {
  filter_modal_open: PropTypes.bool.isRequired,
  set_filter_modal_open: PropTypes.func.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  all_columns: PropTypes.array.isRequired
}
