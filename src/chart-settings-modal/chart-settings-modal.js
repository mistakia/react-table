import React from 'react'
import PropTypes from 'prop-types'
import './chart-settings-modal.styl'

// The chrome around a chart's settings form -- backdrop, panel, titled header
// with a close control, scrolling body, and a Cancel / Save footer. The FORM is
// the caller's; every chart has a different set of fields and none of that
// belongs here.
//
// Shared rather than copied because the `.modal-*` rules were already global,
// declared once in the scatter plot's stylesheet and reached by anything that
// used the same class names. That made a second chart's modal depend on the
// first chart's stylesheet having been pulled in -- load order a component
// cannot assert, and a dependency nothing in the source states.
//
// The chrome rules hang off the generic `chart-settings-modal` classes.
// `class_name` is applied ALONGSIDE them, so each chart keeps a hook of its own
// for width overrides and for the specs that assert on it by name.
const ChartSettingsModal = ({
  title,
  class_name,
  aria_label,
  on_save,
  on_cancel,
  save_label = 'Save',
  cancel_label = 'Cancel',
  children
}) => {
  // Escape closes THIS modal and stops there. Both chart overlays close
  // themselves on a document-level Escape, so without this the key dismissed
  // the whole chart out from under an open settings form and discarded
  // everything typed into it. Registered on the CAPTURE phase, because the
  // overlay's listener is on `document` too -- a bubble-phase handler here
  // cannot get in front of it, and stopPropagation from one document listener
  // does not reach another.
  React.useEffect(() => {
    const handle_key_down = (event) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      on_cancel()
    }
    document.addEventListener('keydown', handle_key_down, true)
    return () => document.removeEventListener('keydown', handle_key_down, true)
  }, [on_cancel])

  return (
    <div
      className={`chart-settings-modal-overlay ${class_name}-overlay`}
      role='dialog'
      aria-modal='true'
      aria-label={aria_label || title}>
      <div className={`chart-settings-modal ${class_name}`}>
        <div className='modal-header'>
          <h3 className='modal-title'>{title}</h3>
          <button
            className='modal-close-btn'
            onClick={on_cancel}
            type='button'
            aria-label='Close settings'>
            &times;
          </button>
        </div>
        <div className='modal-body'>{children}</div>
        <div className='modal-footer'>
          <button
            className='modal-btn modal-btn-cancel'
            onClick={on_cancel}
            type='button'>
            {cancel_label}
          </button>
          <button
            className='modal-btn modal-btn-save'
            onClick={on_save}
            type='button'>
            {save_label}
          </button>
        </div>
      </div>
    </div>
  )
}

ChartSettingsModal.propTypes = {
  title: PropTypes.string.isRequired,
  class_name: PropTypes.string.isRequired,
  aria_label: PropTypes.string,
  on_save: PropTypes.func.isRequired,
  on_cancel: PropTypes.func.isRequired,
  save_label: PropTypes.string,
  cancel_label: PropTypes.string,
  children: PropTypes.node
}

export default ChartSettingsModal
