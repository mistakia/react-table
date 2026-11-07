import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import './helpers/stub-uninstalled-peers.js' // Table reaches peers this repo does not install
import { describe, it, before, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import Table from '../src/table/table.js'
import { SKELETON_ROW_COUNT } from '../src/table-skeleton-rows/table-skeleton-rows.js'

// A loading table holds placeholder rows at its columns' widths, so the rows
// that land replace them in place instead of pushing the page down.

const all_columns = {
  name: {
    column_id: 'name',
    column_name: 'name',
    header_label: 'Name',
    accessorKey: 'name',
    data_type: 2,
    size: 200
  },
  count: {
    column_id: 'count',
    column_name: 'count',
    header_label: 'Count',
    accessorKey: 'count',
    data_type: 1,
    size: 90
  }
}

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
        table_state={{ columns: ['name', 'count'] }}
        {...props}
      />
    )
  })
  return container
}

before(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
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

describe('table skeleton rows', () => {
  it('holds placeholder rows at the header cells widths while loading', async () => {
    const container = await render_table({ data: [], is_loading: true })
    const rows = container.querySelectorAll('.table-skeleton-row')
    expect(rows.length).to.equal(SKELETON_ROW_COUNT)

    const skeleton_widths = [...rows[0].querySelectorAll('.cell')].map(
      (cell) => cell.style.width
    )
    const header_row = [...container.querySelectorAll('.header .row')].at(-1)
    const header_widths = [...header_row.querySelectorAll('.cell')].map(
      (cell) => cell.style.width
    )
    // The header sizes the row-number gutter from a CSS variable rather than
    // inline; every other column carries its width inline on both rows.
    expect(skeleton_widths.slice(1)).to.deep.equal(header_widths.slice(1))
    // The gutter and the add-column control keep their width and draw no bar.
    expect(rows[0].querySelectorAll('.table-skeleton-bar').length).to.equal(2)
  })

  it('drops the placeholders once the read has landed', async () => {
    const container = await render_table({
      data: [{ name: 'A', count: 1 }],
      is_loading: false
    })
    // jsdom has no layout, so the virtualizer renders no body rows here; the
    // contract under test is only that the placeholders are gone.
    expect(container.querySelectorAll('.table-skeleton-row').length).to.equal(0)
  })
})
