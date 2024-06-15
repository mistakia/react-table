import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import './filter-base.styl'

export default function FilterBase({ label, selected_label, body }) {
  const [visible, set_visible] = useState(false)
  const button_ref = useRef()
  const dropdown_ref = useRef()
  const handle_toggle_click = () => set_visible(!visible)

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='table-filter-item'
          onClick={handle_toggle_click}
          ref={button_ref}>
          <div className='table-filter-item-label'>{label}</div>
          <div className='table-filter-item-selection'>{selected_label}</div>
        </div>
        <Popper
          open={visible}
          anchorEl={button_ref.current}
          placement='bottom-start'
          className='table-filter-item-dropdown'
          ref={dropdown_ref}>
          {body}
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

FilterBase.propTypes = {
  label: PropTypes.string.isRequired,
  selected_label: PropTypes.string.isRequired,
  body: PropTypes.node.isRequired
}
