import React, { useEffect, useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'

import TableViewModal from '#src/table-view-modal'
import { fuzzy_match, generate_view_id, get_string_from_object } from '#src/utils'
import { MENU_CLOSE_TIMEOUT } from '#src/constants.mjs'
import { table_context } from '#src/table-context'
import ViewItem from './view-item'

import './table-view-controller.styl'

const TableViewController = ({
  select_view,
  selected_view,
  views,
  on_view_change,
  delete_view,
  disable_create_view = false,
  disable_edit_view = false,
  new_view_prefix_columns = []
}) => {
  const { table_username } = useContext(table_context)
  const [input_value, set_input_value] = React.useState('')
  const [selected_edit_view, set_selected_edit_view] = React.useState({})
  const [edit_view_modal_open, set_edit_view_modal_open] = React.useState(false)
  const [view_controls_open, set_view_controls_open] = React.useState(false)
  const [closing, set_closing] = React.useState(false)

  const container_ref = React.useRef(null)
  const input_ref = React.useRef(null)
  const [transform, set_transform] = React.useState('')

  const handle_menu_toggle = useCallback(() => {
    if (view_controls_open) {
      set_closing(true)
      set_view_controls_open(false)

      setTimeout(() => {
        set_closing(false)
      }, MENU_CLOSE_TIMEOUT)
    } else {
      set_view_controls_open(true)
    }
  }, [view_controls_open])

  const handle_input_change = (event) => {
    const { value } = event.target
    set_input_value(value)
  }

  const handle_select_view = (view) => {
    select_view(view.view_id)
    set_input_value('')
  }

  const handle_add_click = () => {
    on_view_change(
      {
        ...selected_view,
        view_id: generate_view_id(),
        view_name: 'New view',
        view_username: table_username || 'system',
        view_description: 'New view description',
        saved_table_state: null,
        table_state: {
          prefix_columns: new_view_prefix_columns,
          columns: [],
          sort: [],
          where: []
        }
      },
      {
        view_state_changed: true,
        is_new_view: true
      }
    )
    handle_menu_toggle()
  }

  const filtered_views = input_value
    ? views.filter((view) => fuzzy_match(input_value, view.view_name))
    : views

  const filtered_items = filtered_views.map((view, index) => (
    <ViewItem
      key={view.view_id}
      {...{
        handle_select_view,
        set_selected_edit_view,
        set_edit_view_modal_open,
        delete_view,
        view,
        index,
        on_view_change,
        disable_edit_view,
        selected_view,
        handle_menu_toggle
      }}
    />
  ))

  const handle_click_away = useCallback(
    (event) => {
      if (view_controls_open && !container_ref.current.contains(event.target)) {
        set_closing(true)
        set_view_controls_open(false)

        setTimeout(() => {
          set_closing(false)
        }, MENU_CLOSE_TIMEOUT)
      }
    },
    [view_controls_open]
  )

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && view_controls_open) {
        handle_menu_toggle()
      }
    }

    if (view_controls_open) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [view_controls_open, handle_menu_toggle])

  useEffect(() => {
    if (view_controls_open) {
      if (container_ref.current) {
        const original_rect = container_ref.current.getBoundingClientRect()
        const scroll_left =
          window.pageXOffset || document.documentElement.scrollLeft
        const window_center_x = window.innerWidth / 2 + scroll_left
        const element_width =
          window.innerWidth < 768
            ? 0.9 * window.innerWidth
            : 0.6 * window.innerWidth
        const element_center_x =
          original_rect.left + element_width / 2 + scroll_left

        const translate_x = window_center_x - element_center_x

        set_transform(`translateX(${translate_x}px)`)
      }
    } else {
      set_transform('')
    }
  }, [view_controls_open])

  // Add this function to get the current view details
  const get_current_view_details = () => {
    const current_view = views.find(
      (view) => view.view_id === selected_view.view_id
    )
    return current_view
      ? {
          title: current_view.view_name,
          description: current_view.view_description,
          username: current_view.view_username
        }
      : { title: 'Views', description: '' }
  }

  const { title, description, username } = get_current_view_details()

  return (
    <div className='table-view-controller-container'>
      <ClickAwayListener onClickAway={handle_click_away}>
        <div
          ref={container_ref}
          style={{ transform }}
          className={get_string_from_object({
            'table-expanding-control-container': true,
            'table-view-controller': true,
            '-open': view_controls_open,
            '-closing': closing
          })}>
          <div
            onClick={handle_menu_toggle}
            className='table-expanding-control-button'>
            <label className='table-expanding-control-label'>
              Current View
            </label>
            <div className='current-view-info'>
              <div className='current-view-username'>{username}</div>
              <div className='current-view-title'>{title}</div>
              {description && (
                <div className='current-view-description'>{description}</div>
              )}
            </div>
          </div>
          {view_controls_open && (
            <div className='table-view-controls'>
              <div className='table-view-header'>
                <TextField
                  size='small'
                  label='Filter Views'
                  placeholder='Filter views'
                  value={input_value}
                  onChange={handle_input_change}
                  autoComplete='off'
                  inputRef={input_ref}
                />
              </div>
              <div className='table-view-list'>{filtered_items}</div>
              {!disable_create_view && (
                <div className='table-view-footer'>
                  <div
                    className='table-view-add-button'
                    onClick={handle_add_click}>
                    <AddIcon />
                    Add view
                  </div>
                </div>
              )}
            </div>
          )}
          <TableViewModal
            {...{
              view: selected_edit_view,
              edit_view_modal_open,
              set_edit_view_modal_open,
              on_view_change
            }}
          />
        </div>
      </ClickAwayListener>
    </div>
  )
}

TableViewController.propTypes = {
  select_view: PropTypes.func.isRequired,
  selected_view: PropTypes.object.isRequired,
  views: PropTypes.array,
  on_view_change: PropTypes.func.isRequired,
  delete_view: PropTypes.func.isRequired,
  disable_create_view: PropTypes.bool,
  disable_edit_view: PropTypes.bool,
  new_view_prefix_columns: PropTypes.array
}

export default React.memo(TableViewController)
