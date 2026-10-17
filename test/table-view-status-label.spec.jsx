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
  }
}

const TABLE_STATE = { columns: ['player_name'], sort: [], where: [] }

const SELECTED_VIEW = {
  view_id: 'view-1',
  view_name: 'All Players',
  view_username: 'alice',
  view_description: 'Basic player table',
  table_state: TABLE_STATE,
  search: { type: 'client', fields: ['player_name'], key_field: 'pid' },
  is_editable: true
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
        data={[]}
        table_state={TABLE_STATE}
        views={[SELECTED_VIEW]}
        selected_view={SELECTED_VIEW}
        table_username='alice'
        new_view_prefix_columns={['player_name']}
        saved_table_state={TABLE_STATE}
        on_view_change={() => {}}
        {...props}
      />
    )
  })
  return container
}

before(() => {
  // @tanstack/react-virtual measures its scroll element and there is no
  // ResizeObserver in this DOM.
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
      await act(async () => container._react_root.unmount())
    }
    container.remove()
  }
  _containers = []
})

const status_labels = (container, selector) =>
  [...container.querySelectorAll(`${selector} .table-view-status-label`)].map(
    (node) => node.textContent
  )

const open_view_list = (container) =>
  act(async () =>
    container
      .querySelector('.table-view-controller .table-expanding-control-button')
      .click()
  )

describe('view status label', () => {
  // A consumer marks a view that is not simply there -- league's "Building" for
  // a view an agent is still generating. The word belongs to the consumer; the
  // library only renders it, beside the name, wherever the view is named.
  it('renders beside the current view title and the view in the list', async () => {
    const building = { ...SELECTED_VIEW, status_label: 'Building' }
    const container = await render_table({
      views: [building],
      selected_view: building
    })
    expect(status_labels(container, '.current-view-title')).to.deep.equal([
      'Building'
    ])

    await open_view_list(container)
    expect(status_labels(container, '.table-view-item-name')).to.deep.equal([
      'Building'
    ])
  })

  it('renders nothing for a view without one', async () => {
    const container = await render_table()
    await open_view_list(container)
    expect(container.querySelector('.table-view-status-label')).to.equal(null)
  })
})
