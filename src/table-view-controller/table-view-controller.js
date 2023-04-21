import React from 'react'
import PropTypes from 'prop-types'
import ClickAwayListener from '@mui/base/ClickAwayListener'
import PopperUnstyled from '@mui/base/PopperUnstyled'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import AddIcon from '@mui/icons-material/Add'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'

import TableViewModal from '../table-view-modal'
import { fuzzy_match } from '../utils'

import './table-view-controller.styl'

function ViewItem({
  view,
  handle_select_view,
  set_selected_edit_view,
  set_edit_view_modal_open,
  set_views_popper_open,
  delete_view,
  on_view_change
}) {
  const anchor_el = React.useRef()
  const [misc_menu_open, set_misc_menu_open] = React.useState(false)

  const handle_edit_click = () => {
    set_selected_edit_view(view)
    set_views_popper_open(false)
    set_edit_view_modal_open(true)
  }

  const handle_remove_click = () => {
    delete_view(view.view_id)
    set_misc_menu_open(false)
  }

  const handle_duplicate_click = () => {
    on_view_change({
      view_name: `${view.view_name} (copy)`,
      view_description: view.view_description,
      table_state: view.table_state
    })
    set_misc_menu_open(false)
  }

  return (
    <div className='table-view-item'>
      <div className='table-view-item-left' onClick={handle_select_view(view)}>
        <div className='table-view-item-name'>{view.view_name}</div>
        <div className='table-view-item-description'>
          {view.view_description}
        </div>
      </div>
      <div className='table-view-item-right'>
        <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
          <div>
            <IconButton
              className='table-view-item-right-action'
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
                <div className='misc-menu-item' onClick={handle_edit_click}>
                  <div className='misc-menu-item-icon'>
                    <EditIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Edit</div>
                </div>
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
              </div>
            </PopperUnstyled>
          </div>
        </ClickAwayListener>
      </div>
    </div>
  )
}

ViewItem.propTypes = {
  view: PropTypes.object.isRequired,
  handle_select_view: PropTypes.func.isRequired,
  set_selected_edit_view: PropTypes.func.isRequired,
  set_edit_view_modal_open: PropTypes.func.isRequired,
  set_views_popper_open: PropTypes.func.isRequired,
  delete_view: PropTypes.func.isRequired,
  on_view_change: PropTypes.func.isRequired
}

export default function TableViewController({
  select_view,
  selected_view,
  views,
  on_view_change,
  delete_view
}) {
  const anchor_el = React.useRef()
  const [input_value, set_input_value] = React.useState()
  const [selected_view_name, set_selected_view_name] = React.useState(
    selected_view.view_name
  )
  const [selected_edit_view, set_selected_edit_view] = React.useState({})
  const [edit_view_modal_open, set_edit_view_modal_open] = React.useState(false)
  const [views_popper_open, set_views_popper_open] = React.useState(false)

  React.useEffect(() => {
    set_selected_view_name(selected_view.view_name)
  }, [selected_view.view_name])

  const handleInputChange = (event) => {
    const { value } = event.target
    set_input_value(value)
  }
  const handleInputBlur = () => {
    set_input_value(undefined)
    set_selected_view_name(selected_view.view_name)
  }
  const handleInputFocus = (event) => {
    set_selected_view_name('')
    event.target.select()
    set_views_popper_open(true)
  }
  const handle_select_view = (view) => () => {
    set_views_popper_open(false)
    select_view(view.view_id)
    set_input_value(undefined)
  }
  const handleClickAway = () => set_views_popper_open(false)

  const handle_add_click = () => {
    on_view_change({
      view_name: 'New view',
      view_description: 'New view description',
      table_state: {
        columns: [],
        sorting: [],
        where: []
      }
    })
  }

  const filtered_views = input_value
    ? views.filter((view) => fuzzy_match(input_value, view.view_name))
    : views

  const filtered_items = filtered_views.map((view, index) => (
    <ViewItem
      key={index}
      {...{
        handle_select_view,
        set_selected_edit_view,
        set_edit_view_modal_open,
        set_views_popper_open,
        delete_view,
        view,
        index,
        on_view_change
      }}
    />
  ))

  return (
    <>
      <ClickAwayListener onClickAway={handleClickAway}>
        <div className='table-view-menu'>
          <TextField
            size='small'
            label='View'
            placeholder='Filter views'
            value={
              typeof input_value === 'undefined'
                ? selected_view_name
                : input_value
            }
            onChange={handleInputChange}
            className='table-view-input'
            autoComplete='off'
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
            open={views_popper_open}
            anchorEl={anchor_el.current}>
            <div className='table-view-list'>{filtered_items}</div>
            <div className='table-view-popper-footer'>
              <div className='table-view-add-button' onClick={handle_add_click}>
                <AddIcon />
                Add view
              </div>
            </div>
          </PopperUnstyled>
        </div>
      </ClickAwayListener>
      <TableViewModal
        {...{
          view: selected_edit_view,
          edit_view_modal_open,
          set_edit_view_modal_open,
          on_view_change
        }}
      />
    </>
  )
}

TableViewController.propTypes = {
  select_view: PropTypes.func.isRequired,
  selected_view: PropTypes.object.isRequired,
  views: PropTypes.array,
  on_view_change: PropTypes.func.isRequired,
  delete_view: PropTypes.func.isRequired
}
