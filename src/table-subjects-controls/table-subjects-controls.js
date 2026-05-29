import React from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'

import './table-subjects-controls.styl'

const TableSubjectsControls = ({
  current_subject,
  subject_options,
  on_subject_change
}) => {
  return (
    <div className='table-subjects-controls'>
      {subject_options.map((option) => {
        const is_active = option.value === current_subject
        return (
          <div
            key={option.value}
            className={get_string_from_object({
              'table-subjects-controls-option': true,
              '-active': is_active
            })}
            onClick={() => {
              if (!is_active) on_subject_change(option.value)
            }}>
            {option.label}
          </div>
        )
      })}
    </div>
  )
}

TableSubjectsControls.propTypes = {
  current_subject: PropTypes.string.isRequired,
  subject_options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  on_subject_change: PropTypes.func.isRequired
}

export default TableSubjectsControls
