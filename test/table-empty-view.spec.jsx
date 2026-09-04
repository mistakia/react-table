import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import './helpers/stub-uninstalled-peers.js' // Table reaches peers this repo does not install
import { describe, it, before, afterEach } from 'mocha'
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
  },
  player_points: {
    column_id: 'player_points',
    column_name: 'player_points',
    header_label: 'Points',
    accessorKey: 'player_points',
    data_type: 1
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
    root.render(<Table all_columns={all_columns} {...props} />)
  })
  return container
}

before(() => {
  // @tanstack/react-virtual measures its scroll element. happy-dom ships no
  // ResizeObserver, and without one the virtualizer throws on mount.
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

describe('table empty view', () => {
  it('renders no header rows when there are no columns and no rows', async () => {
    const container = await render_table({
      data: [],
      // Prefix columns are what makes this worth asserting: they resolve into
      // header cells of their own, so a header suppressed only when the header
      // is EMPTY would still draw a Name strip over the empty state.
      table_state: { columns: [], prefix_columns: ['player_name'] }
    })

    expect(container.querySelectorAll('.header .row')).to.have.length(0)
  })

  it('renders header rows when columns are selected but no rows came back', async () => {
    const container = await render_table({
      data: [],
      table_state: { columns: ['player_points'], prefix_columns: [] }
    })

    expect(container.querySelectorAll('.header .row').length).to.be.greaterThan(
      0
    )
  })

  it('offers no save action on an empty unsaved view', async () => {
    const container = await render_table({
      data: [],
      table_state: { columns: [], prefix_columns: ['player_name'] },
      is_selected_view_editable: true
    })

    expect(
      container.querySelectorAll('.table-top-lead-button.save')
    ).to.have.length(0)
  })

  it('offers a save action once a column is selected', async () => {
    const container = await render_table({
      data: [],
      table_state: { columns: ['player_points'], prefix_columns: [] },
      is_selected_view_editable: true
    })

    expect(
      container.querySelectorAll('.table-top-lead-button.save')
    ).to.have.length(1)
  })

  it('keeps the reset action after every column is removed from a saved view', async () => {
    const container = await render_table({
      data: [],
      table_state: { columns: [], prefix_columns: [] },
      saved_table_state: { columns: ['player_points'], prefix_columns: [] },
      is_selected_view_editable: true
    })

    expect(
      container.querySelectorAll('.table-top-lead-button.discard')
    ).to.have.length(1)
  })
})
