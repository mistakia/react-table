import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import BarChartRowsPanel from '../src/bar-chart-overlay/bar-chart-rows-panel'
import { DEFAULT_BAR_CHART_ROW_LIMIT } from '../src/bar-chart-overlay/bar-chart-data.js'

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

const mount = async ({
  bar_chart_options = {},
  row_count = 40,
  total_row_count = 500,
  on_change = () => {}
} = {}) => {
  const container = make_container()
  await render(
    React.createElement(BarChartRowsPanel, {
      bar_chart_options,
      row_count,
      total_row_count,
      on_change
    }),
    container
  )
  return container
}

const buttons_of = (container) =>
  Array.from(container.getElementsByTagName('button'))

const find_button = (container, text) =>
  buttons_of(container).find(
    (button) => button.textContent.trim().toLowerCase() === text.toLowerCase()
  )

const open_panel = async (container) => {
  const trigger = buttons_of(container)[0]
  await act(async () => {
    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })
  return trigger
}

describe('BarChartRowsPanel', () => {
  // The toolbar button IS the scope readout. The whole reason this control
  // moved out of the settings modal is that a reader looking at a truncated
  // chart should see the truncation on the control that fixes it.
  it('names the drawn and total counts on the trigger when truncated', async () => {
    const container = await mount()
    expect(buttons_of(container)[0].textContent).to.equal('Rows: 40 of 500')
  })

  it('names only the count when nothing was dropped', async () => {
    const container = await mount({ row_count: 32, total_row_count: 32 })
    expect(buttons_of(container)[0].textContent).to.equal('Rows: 32')
  })

  it('stays closed until the trigger is clicked', async () => {
    const container = await mount()
    expect(container.querySelector('.bar-chart-rows-popover')).to.equal(null)
    await open_panel(container)
    expect(container.querySelector('.bar-chart-rows-popover')).to.not.equal(
      null
    )
  })

  it('writes a preset straight through without a save step', async () => {
    const on_change = sinon.spy()
    const container = await mount({ on_change })
    await open_panel(container)

    await act(async () => {
      find_button(container, '25').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })

    expect(on_change.calledOnce).to.equal(true)
    expect(on_change.firstCall.args[0].row_limit).to.equal(25)
  })

  // Absence means the DEFAULT and null means every row, so "All" cannot be
  // written as today's row count -- that pins a saved view to the size its data
  // happened to be and silently truncates again when the view returns more.
  it('writes All as an explicit null rather than the current total', async () => {
    const on_change = sinon.spy()
    const container = await mount({ on_change })
    await open_panel(container)

    await act(async () => {
      find_button(container, 'all').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })

    expect(on_change.firstCall.args[0].row_limit).to.equal(null)
  })

  it('resets by deleting the key, not by writing the default number', async () => {
    const on_change = sinon.spy()
    const container = await mount({
      bar_chart_options: { row_limit: 10 },
      on_change
    })
    await open_panel(container)

    const reset = find_button(
      container,
      `Reset to ${DEFAULT_BAR_CHART_ROW_LIMIT}`
    )
    await act(async () => {
      reset.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    })

    const written = on_change.firstCall.args[0]
    expect('row_limit' in written).to.equal(false)
  })

  // Found in a browser, not here: on a default chart the stored field is
  // absent, so highlighting against it left every preset unselected while the
  // readout directly above said the chart was drawing forty.
  it('highlights the preset the chart is actually drawing, default included', async () => {
    const container = await mount()
    await open_panel(container)
    expect(
      find_button(container, String(DEFAULT_BAR_CHART_ROW_LIMIT)).className
    ).to.include('active')

    const explicit = await mount({ bar_chart_options: { row_limit: 25 } })
    await open_panel(explicit)
    expect(find_button(explicit, '25').className).to.include('active')
    expect(
      find_button(explicit, String(DEFAULT_BAR_CHART_ROW_LIMIT)).className
    ).to.not.include('active')
  })

  it('highlights All when every row is drawn', async () => {
    const container = await mount({
      bar_chart_options: { row_limit: null },
      row_count: 500
    })
    await open_panel(container)
    expect(find_button(container, 'all').className).to.include('active')
  })

  it('offers no reset when the chart is already on the default', async () => {
    const container = await mount()
    await open_panel(container)
    expect(container.querySelector('.bar-chart-rows-reset')).to.equal(null)
  })

  // 'top' is the default, so selecting it must DELETE the key rather than
  // write the string. A key present with an undefined value would survive the
  // spread and fail the options schema, which surfaces as a view that will not
  // save rather than as a rejected field.
  it('writes the rank window as absence for top and a string for bottom', async () => {
    const on_change = sinon.spy()
    const container = await mount({
      bar_chart_options: { rank_window: 'bottom' },
      on_change
    })
    await open_panel(container)

    await act(async () => {
      find_button(container, 'top').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })
    expect('rank_window' in on_change.firstCall.args[0]).to.equal(false)

    await act(async () => {
      find_button(container, 'bottom').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })
    expect(on_change.secondCall.args[0].rank_window).to.equal('bottom')
  })

  // The overlay closes the whole chart on a document-level Escape. Without a
  // capture-phase guard here the key dismisses the chart out from under an open
  // panel -- the defect the settings modal already carries a fix for, which
  // does not transfer because each popover has to stop the key itself.
  it('swallows Escape while open so the chart is not closed under it', async () => {
    const chart_close = sinon.spy()
    document.addEventListener('keydown', chart_close)
    try {
      const container = await mount()
      await open_panel(container)

      await act(async () => {
        document.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true
          })
        )
      })

      expect(container.querySelector('.bar-chart-rows-popover')).to.equal(null)
      expect(chart_close.called).to.equal(false)
    } finally {
      document.removeEventListener('keydown', chart_close)
    }
  })

  // The control does not exist while the panel is shut, so a closed panel must
  // not be swallowing the key the chart listens for.
  it('lets Escape through to the chart while closed', async () => {
    const chart_close = sinon.spy()
    document.addEventListener('keydown', chart_close)
    try {
      await mount()
      await act(async () => {
        document.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true
          })
        )
      })
      expect(chart_close.called).to.equal(true)
    } finally {
      document.removeEventListener('keydown', chart_close)
    }
  })
})
