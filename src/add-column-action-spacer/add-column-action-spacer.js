import React from 'react'
import PropTypes from 'prop-types'

import { ADD_COLUMN_ACTION_WIDTH } from '#src/constants.mjs'

// Reserves the trailing add-column control's width in the rows that do not
// draw it -- the body, the footer, and every header row below the first. The
// control is part of the column model, so a row that skips it comes out
// narrower than the scroll extent, and a sticky cell cannot be pushed past its
// own row's right edge: at maximum horizontal scroll the trailing pinned
// columns get clamped short of their offsets and slide on top of each other.
//
// Renders nothing when the control itself is suppressed, so the rows stay in
// agreement either way.
export default function AddColumnActionSpacer({ table_state }) {
  if (table_state?.disable_column_controls) {
    return null
  }

  return (
    <div
      className='cell add-column-action'
      style={{ width: ADD_COLUMN_ACTION_WIDTH }}
    />
  )
}

AddColumnActionSpacer.propTypes = {
  table_state: PropTypes.object
}
