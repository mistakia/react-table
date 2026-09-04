import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import PropTypes from 'prop-types'

import use_expanding_control_anchor from '../src/utils/use-expanding-control-anchor.js'

let _containers = []

const make_container = () => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  _containers.push(div)
  return div
}

afterEach(async () => {
  for (const c of _containers) {
    if (c._react_root) {
      await act(async () => {
        c._react_root.unmount()
      })
    }
    c.remove()
  }
  _containers = []
})

const render = async (ui, container) => {
  await act(async () => {
    const root = createRoot(container)
    container._react_root = root
    root.render(ui)
  })
}

const Probe = ({ is_open, is_closing = false, open_width = 600 }) => {
  const { container_ref, anchor_style } = use_expanding_control_anchor({
    is_open,
    is_closing,
    open_width
  })

  return (
    <div
      ref={container_ref}
      data-testid='control'
      style={anchor_style || undefined}
    />
  )
}

Probe.propTypes = {
  is_open: PropTypes.bool,
  is_closing: PropTypes.bool,
  open_width: PropTypes.number
}

const get_control = (container) =>
  container.querySelector('[data-testid="control"]')

describe('use_expanding_control_anchor', () => {
  it('leaves the closed control to the stylesheet', async () => {
    const container = make_container()
    await render(<Probe is_open={false} />, container)

    const control = get_control(container)
    expect(control.style.position).to.equal('')
    expect(control.style.top).to.equal('')
    expect(control.style.maxHeight).to.equal('')
  })

  // The whole point of the change: an `absolute` panel is clipped by every
  // consumer container that is not the full page, which is what hid the column
  // and filter managers inside league's selected-player drawer.
  it('pins the open control to the viewport so no ancestor can clip it', async () => {
    const container = make_container()
    await render(<Probe is_open />, container)

    const control = get_control(container)
    expect(control.style.position).to.equal('fixed')
    expect(control.style.top).to.match(/^\d+px$/)
    expect(control.style.left).to.match(/^\d+px$/)
    expect(control.style.maxHeight).to.match(/^\d+px$/)
  })

  it('caps the open height to the viewport', async () => {
    const container = make_container()
    await render(<Probe is_open />, container)

    const control = get_control(container)
    const max_height = parseInt(control.style.maxHeight, 10)
    expect(max_height).to.be.greaterThan(0)
    expect(max_height).to.be.at.most(window.innerHeight)
  })

  it('holds the fixed frame while closing so the panel animates back', async () => {
    const container = make_container()
    await render(<Probe is_open={false} is_closing />, container)

    const control = get_control(container)
    expect(control.style.position).to.equal('fixed')
    expect(control.style.transform).to.equal('translateX(0px)')
    expect(control.style.maxHeight).to.equal('')
  })
})
