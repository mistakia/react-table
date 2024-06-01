import React, { useState, useCallback, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import ClickAwayListener from '@mui/material/ClickAwayListener'

import { debounce, get_string_from_object } from '../utils'

import './table-search.styl'

export default function TableSearch({
  selected_view,
  table_state,
  on_table_state_change
}) {
  const [text_search_value, set_text_search_value] = useState('')
  const [is_open, set_is_open] = useState(false)
  const input_ref = useRef(null)

  useEffect(() => {
    const where_param = table_state.where || []
    const where_param_index = where_param.findIndex((where_item) => {
      return (
        where_item.column_id === selected_view.view_search_column_id &&
        where_item.operator === 'ILIKE'
      )
    })

    if (where_param_index > -1) {
      set_text_search_value(where_param[where_param_index].value)
    } else {
      set_text_search_value('')
    }
  }, [table_state])

  const handle_search = useCallback(
    debounce((value) => {
      const where_param = table_state.where || []
      const where_param_index = where_param.findIndex((where_item) => {
        return (
          where_item.column_id === selected_view.view_search_column_id &&
          where_item.operator === 'ILIKE'
        )
      })

      if (where_param_index > -1) {
        where_param[where_param_index].value = value
      } else {
        where_param.push({
          column_id: selected_view.view_search_column_id,
          operator: 'ILIKE',
          value
        })
      }

      on_table_state_change({
        ...table_state,
        where: where_param
      })
    }, 500),
    []
  )

  const handle_change = (event) => {
    set_text_search_value(event.target.value)
    handle_search(event.target.value)
  }

  const handle_clear = useCallback(() => {
    set_text_search_value('')

    const where_param = table_state.where || []
    const where_param_index = where_param.findIndex((where_item) => {
      return (
        where_item.column_id === selected_view.view_search_column_id &&
        where_item.operator === 'ILIKE'
      )
    })

    if (where_param_index > -1) {
      where_param.splice(where_param_index, 1)
      on_table_state_change({
        ...table_state,
        where: where_param
      })
    }
  }, [table_state])

  const handle_icon_click = () => {
    set_is_open(true)
    input_ref.current.focus()
  }

  const handle_key_down = (event) => {
    if (event.key === 'Escape') {
      set_is_open(false)
      input_ref.current.blur()
    }
  }

  useEffect(() => {
    const inputElement = input_ref.current
    if (inputElement) {
      inputElement.addEventListener('keydown', handle_key_down)
    }
    return () => {
      if (inputElement) {
        inputElement.removeEventListener('keydown', handle_key_down)
      }
    }
  }, [])

  const table_search_ref = useRef(null)
  useEffect(() => {
    if (is_open) {
      if (table_search_ref.current) {
        setTimeout(() => {
          table_search_ref.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          })
        }, 200)
      }
    }
  }, [is_open])

  return (
    <ClickAwayListener onClickAway={() => set_is_open(false)}>
      <div
        ref={table_search_ref}
        className={get_string_from_object({
          'table-search': true,
          '-open': is_open
        })}>
        <div className='table-search-icon'>
          <SearchIcon onClick={handle_icon_click} />
        </div>
        <input
          ref={input_ref}
          className='table-search-input'
          type='text'
          placeholder='Search'
          value={text_search_value}
          onChange={handle_change}
        />
        {text_search_value && (
          <div className='table-search-clear' onClick={handle_clear}>
            <ClearIcon />
          </div>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableSearch.propTypes = {
  selected_view: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}
