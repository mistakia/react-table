// The message shown IN PLACE of a parameter control when the selected columns
// cannot be reconciled.
//
// It is deliberately its own module rather than a branch inside
// ParametersEditorItem. That component imports all six filter components, one
// of which needs a peer dependency the library does not install, so nothing
// that imports it can be unit-tested — and this copy is worth testing.
//
// Four properties are load-bearing:
//
//   1. It names EVERY column on each side, using the same `column_title ||
//      column_id` string the bulk-edit checkbox row renders, so a user can find
//      the row to untick.
//   2. It names the disagreement in the user's terms — a single value versus a
//      range — never in field names.
//   3. It states both remedies: deselect, or edit the columns individually.
//   4. It stays visible. Hiding the parameter would reproduce the original
//      defect more quietly: the user would learn nothing except that a control
//      had disappeared.

import React from 'react'
import PropTypes from 'prop-types'

import { CONFLICT_REASONS } from '#src/utils/resolve-param-definition-across-records.js'

// Beyond this many, a value list stops informing and starts filling the panel,
// so the message states how many there are instead. Naming them is the more
// useful form wherever it fits: "OPEN or CLOSE" tells a user what the columns
// actually disagree about, where "2 values" does not.
const MAX_NAMED_VALUES = 6

export const describe_admissible_values = (values = []) => {
  const keys = values.map((entry) => entry?.value ?? entry)
  if (!keys.length) return 'no values'
  if (keys.length > MAX_NAMED_VALUES) return `${keys.length} values`
  if (keys.length === 1) return `only ${keys[0]}`
  return `${keys.slice(0, -1).join(', ')} or ${keys[keys.length - 1]}`
}

const conflict_explanation = (reason) => {
  switch (reason) {
    case CONFLICT_REASONS.ARITY:
      return 'The selected columns disagree on how many values this parameter takes.'
    case CONFLICT_REASONS.NO_ADMISSIBLE_VALUES:
      return 'No value works for every selected column.'
    case CONFLICT_REASONS.INCOMPATIBLE_CONTROL:
      return 'The selected columns edit this parameter with different kinds of control.'
    default:
      return 'The selected columns cannot be reconciled for this parameter.'
  }
}

const conflict_group_line = ({ reason, group }) => {
  const columns = group.column_titles.join(', ')
  if (reason === CONFLICT_REASONS.NO_ADMISSIBLE_VALUES) {
    return `${columns} accepts ${describe_admissible_values(group.value)}`
  }
  if (reason === CONFLICT_REASONS.ARITY) {
    return `These columns ${group.label}: ${columns}`
  }
  return columns
}

export default function ParametersEditorConflict({ conflict, param_label }) {
  return (
    <div className='parameters-editor-item parameters-editor-item--conflict'>
      <div className='conflict-heading'>
        {param_label} — cannot be set for this selection
      </div>
      <div className='conflict-explanation'>
        {conflict_explanation(conflict.reason)}
      </div>
      <ul className='conflict-groups'>
        {conflict.groups.map((group, index) => (
          <li key={index}>
            {conflict_group_line({ reason: conflict.reason, group })}
          </li>
        ))}
      </ul>
      <div className='conflict-remedy'>
        Deselect one group to set this parameter, or set it on each column
        individually.
      </div>
    </div>
  )
}

ParametersEditorConflict.propTypes = {
  conflict: PropTypes.shape({
    reason: PropTypes.string.isRequired,
    field: PropTypes.string,
    groups: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.array,
        column_titles: PropTypes.arrayOf(PropTypes.string).isRequired
      })
    ).isRequired
  }).isRequired,
  param_label: PropTypes.string.isRequired
}
