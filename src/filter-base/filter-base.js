import React, { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import './filter-base.styl'

export default function FilterBase({
  label,
  selected_label,
  body,
  width,
  trigger_close
}) {
  const [visible, set_visible] = useState(false)
  const button_ref = useRef()
  const handle_toggle_click = () => {
    console.log('handle_toggle_click')
    console.log({ visible })
    set_visible(!visible)
  }

  const selection_style = width ? { minWidth: width } : {}

  useEffect(() => {
    set_visible(false)
  }, [trigger_close])

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='table-filter-item'
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
          className='table-filter-item-dropdown table-popper'>
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
  trigger_close: PropTypes.bool
}
