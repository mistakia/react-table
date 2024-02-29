import React, { useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'

import { debounce } from '../utils'

import './table-search.styl'

export default function TableSearch({
  selected_view,
  table_state,
  on_table_state_change
}) {
  const [text_search_value, set_text_search_value] = useState('')

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

  const handleSearch = useCallback(
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

  const handleChange = (event) => {
    set_text_search_value(event.target.value)
    handleSearch(event.target.value)
  }

  const handleClear = useCallback(() => {
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

  return (
    <div className='table-search'>
      <input
        className='table-search-input'
        type='text'
        placeholder='Search'
        value={text_search_value}
        onChange={handleChange}
      />
      {text_search_value && (
        <div className='table-search-clear' onClick={handleClear}>
          <ClearIcon />
        </div>
      )}
    </div>
  )
}

TableSearch.propTypes = {
  selected_view: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}
