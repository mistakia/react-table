import React from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'

import './table-segmented-select.styl'

const TableSegmentedSelect = ({ value, options, on_change }) => {
  return (
    <div className='table-segmented-select'>
      {options.map((option) => {
        const is_active = option.value === value
        return (
          <div
            key={option.value}
            className={get_string_from_object({
              'table-segmented-select-option': true,
              '-active': is_active
            })}
            onClick={() => {
              if (!is_active) on_change(option.value)
            }}>
            {option.label}
          </div>
        )
      })}
    </div>
  )
}

TableSegmentedSelect.propTypes = {
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  on_change: PropTypes.func.isRequired
}

export default TableSegmentedSelect
