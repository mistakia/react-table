import React from 'react'
import PropTypes from 'prop-types'
import Tooltip from '@mui/material/Tooltip'

import { get_string_from_object } from '#src/utils'

import './table-segmented-select.styl'

const TableSegmentedSelect = ({
  value,
  options,
  on_change,
  label = null,
  tooltip = null,
  aria_label = null
}) => {
  const group = (
    <div
      className='table-segmented-select'
      role='group'
      aria-label={aria_label || label || undefined}>
      {label && <div className='table-segmented-select-label'>{label}</div>}
      <div className='table-segmented-select-options'>
        {options.map((option) => {
          const is_active = option.value === value
          const node = (
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
          if (option.tooltip) {
            return (
              <Tooltip key={option.value} title={option.tooltip} placement='top'>
                {node}
              </Tooltip>
            )
          }
          return node
        })}
      </div>
    </div>
  )
  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement='top'>
        {group}
      </Tooltip>
    )
  }
  return group
}

TableSegmentedSelect.propTypes = {
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      tooltip: PropTypes.string
    })
  ).isRequired,
  on_change: PropTypes.func.isRequired,
  label: PropTypes.string,
  tooltip: PropTypes.string,
  aria_label: PropTypes.string
}

export default TableSegmentedSelect
