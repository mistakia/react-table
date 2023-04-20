import React from 'react'
import PropTypes from 'prop-types'
import ClickAwayListener from '@mui/base/ClickAwayListener'
import PopperUnstyled from '@mui/base/PopperUnstyled'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

// import TableViewModal from '../table-view-modal'
import { fuzzy_match } from '../utils'

export default function TableViewController({
  select_view,
  selected_view,
  views
}) {
  const anchor_el = React.useRef()
  const [input_value, set_input_value] = React.useState()
  const [selected_value, set_selected_value] = React.useState(
    selected_view.view_name
  )
  // const [manager_open, set_manager_open] = React.useState(false)
  const [popper_open, set_popper_open] = React.useState(false)

  React.useEffect(() => {
    set_selected_value(selected_view.view_name)
  }, [selected_view.view_name])

  const handleInputChange = (event) => {
    const { value } = event.target
    set_input_value(value)
  }
  const handleInputBlur = (event) => {
    set_input_value(undefined)
    set_selected_value(selected_view.view_name)
  }
  const handleInputFocus = (event) => {
    set_selected_value('')
    event.target.select()
    set_popper_open(true)
  }
  const handleSelect = (view) => (event) => {
    set_popper_open(false)
    select_view(view.view_id)
    set_input_value(undefined)
  }
  const handleClickAway = () => set_popper_open(false)
  // const handleMangerClose = () => set_manager_open(false)
  // const handleCreateClick = () => {
  //   set_popper_open(false)
  //   set_manager_open(true)
  // }

  const filtered_views = input_value
    ? views.filter((view) => fuzzy_match(input_value, view.view_name))
    : views

  const filtered_items = filtered_views.map((view, index) => (
    <li className='cursor' key={index} onClick={handleSelect(view)}>
      {view.view_name}
      <br />
      <span>{view.view_description}</span>
    </li>
  ))

  return (
    <>
      <ClickAwayListener onClickAway={handleClickAway}>
        <div className='table-view-menu'>
          <TextField
            label='View'
            placeholder='Filter views'
            value={
              typeof input_value === 'undefined' ? selected_value : input_value
            }
            onChange={handleInputChange}
            className='table-view-input'
            ref={anchor_el}
            InputProps={{
              onFocus: handleInputFocus,
              onBlur: handleInputBlur,
              endAdornment: (
                <InputAdornment position='end'>
                  <ArrowDropDownIcon />
                </InputAdornment>
              )
            }}
          />
          <PopperUnstyled
            className='table-view-popper'
            placement='bottom-start'
            open={popper_open}
            anchorEl={anchor_el.current}>
            <ul className='table-view-list'>{filtered_items}</ul>
            {/* <div className='table-view-popper-footer'>
                  <Button variant='text' size='small' onClick={handleCreateClick}>
                  Create
                  </Button>
                  </div> */}
          </PopperUnstyled>
        </div>
      </ClickAwayListener>
      {/* <TableViewModal open={manager_open} handleClose={handleMangerClose} /> */}
    </>
  )
}

TableViewController.propTypes = {
  select_view: PropTypes.func.isRequired,
  selected_view: PropTypes.object.isRequired,
  views: PropTypes.array
}
