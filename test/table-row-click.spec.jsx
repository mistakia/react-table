import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import './helpers/stub-uninstalled-peers.js' // Table reaches peers this repo does not install
import { describe, it, before, after, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import Table from '../src/table/table.js'

const all_columns = {
  player_name: {
    column_id: 'player_name',
    column_name: 'player_name',
    header_label: 'Name',
    accessorKey: 'player_name',
    data_type: 2
  }
}
const data = [
  { pid: 'a', player_name: 'Alpha' },
  { pid: 'b', player_name: 'Bravo' }
]
const table_state = { columns: [], prefix_columns: ['player_name'] }

let _containers = []

const render_table = async (props) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  _containers.push(container)
  const root = createRoot(container)
  container._react_root = root
  await act(async () => {
    root.render(
      <Table
        all_columns={all_columns}
        data={data}
        table_state={table_state}
        {...props}
      />
    )
  })
  return container
}

const body_rows = (container) =>
  [...container.querySelectorAll('.row')].filter((row) =>
    row.textContent.match(/Alpha|Bravo/)
  )

// The row virtualizer renders only what fits its scroll element, and happy-dom
// measures every element at zero, which renders no body rows at all. Give
// elements a size for this file only.
let original_get_bounding_client_rect
before(() => {
  original_get_bounding_client_rect =
    window.HTMLElement.prototype.getBoundingClientRect
  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600
  })
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

after(() => {
  window.HTMLElement.prototype.getBoundingClientRect =
    original_get_bounding_client_rect
})

afterEach(async () => {
  for (const container of _containers) {
    if (container._react_root) {
      await act(async () => {
        container._react_root.unmount()
      })
    }
    container.remove()
  }
  _containers = []
})

describe('table row click and selection', () => {
  it('calls on_row_click with the row data', async () => {
    const clicked = []
    const container = await render_table({
      on_row_click: (row) => clicked.push(row.pid),
      get_row_id: (row) => row.pid
    })

    const rows = body_rows(container)
    expect(rows.length).to.be.greaterThan(0)
    await act(async () => {
      rows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    })
    expect(clicked).to.deep.equal([
      rows[0].textContent.includes('Alpha') ? 'a' : 'b'
    ])
  })

  it('leaves an Alt-click to the cell', async () => {
    const clicked = []
    const container = await render_table({
      on_row_click: (row) => clicked.push(row.pid)
    })

    await act(async () => {
      body_rows(container)[0].dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, altKey: true })
      )
    })
    expect(clicked).to.have.length(0)
  })

  it('marks the rows named in selected_row_ids', async () => {
    const container = await render_table({
      on_row_click: () => {},
      selected_row_ids: ['b'],
      get_row_id: (row) => row.pid
    })

    const selected = body_rows(container).filter((row) =>
      row.classList.contains('row--selected')
    )
    expect(selected).to.have.length(1)
    expect(selected[0].textContent).to.include('Bravo')
    expect(selected[0].getAttribute('aria-selected')).to.equal('true')
  })

  it('adds nothing to a table without on_row_click', async () => {
    const container = await render_table({})

    for (const row of body_rows(container)) {
      expect(row.classList.contains('row--clickable')).to.equal(false)
      expect(row.hasAttribute('tabindex')).to.equal(false)
    }
  })
})
