import React, { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import './filter-base.styl'

/**
 * `class_name` is a SCOPING SEAM, and it exists because the popper portals.
 *
 * MUI's `Popper` mounts its content on `document.body`, so the dropdown is not
 * a descendant of whatever the consumer wrapped this control in — a consumer
 * stylesheet written as `.my-page .table-filter-item-dropdown` matches nothing,
 * and the only selector that does reach it is the bare class, which repaints
 * the control on every other page in the app.
 *
 * So the consumer's class goes on BOTH halves: the trigger, which is in the
 * flow, and the popper, which is not. A consumer restyling this control for one
 * surface qualifies against that class and cannot reach any other surface.
 */
export default function FilterBase({
  label,
  selected_label,
  body,
  width,
  trigger_close,
  class_name
}) {
  const [visible, set_visible] = useState(false)
  const button_ref = useRef()
  const handle_toggle_click = () => {
    set_visible(!visible)
  }

  const selection_style = width ? { minWidth: width } : {}

  useEffect(() => {
    set_visible(false)
  }, [trigger_close])

  return (
    <ClickAwayListener
      onClickAway={() => set_visible(false)}
      mouseEvent='onMouseDown'>
      <div>
        <div
          className={
            class_name ? `table-filter-item ${class_name}` : 'table-filter-item'
          }
          onClick={handle_toggle_click}
          ref={button_ref}>
          <div className='table-filter-item-label'>{label}</div>
          <div className='table-filter-item-selection' style={selection_style}>
            {selected_label}
          </div>
        </div>
        <Popper
          open={visible}
          anchorEl={button_ref.current}
          placement='bottom-start'
          className={
            class_name
              ? `table-filter-item-dropdown table-popper ${class_name}`
              : 'table-filter-item-dropdown table-popper'
          }
          modifiers={[
            {
              name: 'preventOverflow',
              enabled: true,
              options: { padding: 16, altAxis: true, tether: false }
            },
            { name: 'flip', enabled: true, options: { padding: 16 } }
          ]}>
          {body}
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

FilterBase.propTypes = {
  label: PropTypes.string.isRequired,
  selected_label: PropTypes.string.isRequired,
  body: PropTypes.node.isRequired,
  width: PropTypes.string,
  trigger_close: PropTypes.bool,
  class_name: PropTypes.string
}
