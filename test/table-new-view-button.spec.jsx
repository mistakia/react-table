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
const EMPTY_TABLE_STATE = { columns: [], sort: [], where: [] }

const SELECTED_VIEW = {
  view_id: 'view-1',
  view_name: 'All Players',
  view_username: 'alice',
  view_description: 'Basic player table',
  table_state: TABLE_STATE,
  // Consumer-attached fields a new view must NOT inherit.
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
        // A saved view: the consumer sets this when a view is persisted and
        // leaves it null until then, which is how "new" is told from "exists".
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

const new_view_button = (container) =>
  container.querySelector('.current-view-actions .cva-btn.-new-view')

describe('new view button', () => {
  // One home: the current-view card's action bar, which shows the same actions
  // collapsed and open. The toolbar and the panel header each had a copy.
  it('renders in the current-view card and nowhere else', async () => {
    const container = await render_table()

    const button = new_view_button(container)
    expect(button).to.not.equal(null)
    expect(button.getAttribute('aria-label')).to.equal('New view')
    expect(container.querySelector('.table-new-view-button')).to.equal(null)

    await act(async () =>
      container
        .querySelector('.table-view-controller .table-expanding-control-button')
        .click()
    )
    expect(new_view_button(container)).to.not.equal(null)
    expect(
      container.querySelector('.table-view-header-new-view-button')
    ).to.equal(null)
  })

  it('is hidden on an untouched draft -- no saved state and no columns', async () => {
    const container = await render_table({
      saved_table_state: null,
      table_state: EMPTY_TABLE_STATE
    })
    expect(new_view_button(container)).to.equal(null)
  })

  // The gate asks whether this is an untouched draft, NOT whether it has been
  // persisted. A consumer can hold a view the user built and never saved --
  // league restores one from localStorage with no server row behind it -- and
  // gating on saved_table_state alone withheld the button for the whole life of
  // that page, stranding the user on a view they could not start over from.
  it('is shown on an unsaved view that carries columns', async () => {
    const container = await render_table({ saved_table_state: null })
    expect(new_view_button(container)).to.not.equal(null)
  })

  it('is hidden when the consumer disables view creation', async () => {
    const container = await render_table({ disable_create_view: true })
    expect(new_view_button(container)).to.equal(null)
  })

  it('creates a fresh view seeded with the new-view prefix columns', async () => {
    const calls = []
    const container = await render_table({
      on_view_change: (view, params) => calls.push({ view, params })
    })

    await act(async () => new_view_button(container).click())

    expect(calls.length).to.equal(1)
    const { view, params } = calls[0]
    expect(params.is_new_view).to.equal(true)
    expect(params.view_state_changed).to.equal(true)
    expect(view.view_id).to.not.equal(SELECTED_VIEW.view_id)
    expect(view.view_username).to.equal('alice')
    expect(view.saved_table_state).to.equal(null)
    expect(view.table_state.columns).to.deep.equal([])
    expect(view.table_state.prefix_columns).to.deep.equal(['player_name'])
  })

  it('inherits nothing from the selected view', async () => {
    const calls = []
    const container = await render_table({
      on_view_change: (view, params) => calls.push({ view, params })
    })

    await act(async () => new_view_button(container).click())

    const { view } = calls[0]
    expect(view.search).to.equal(undefined)
    expect(view.is_editable).to.equal(undefined)
  })

  // A click on a card action must not also toggle the panel it sits in.
  it('does not open the panel when clicked on the collapsed card', async () => {
    const container = await render_table()
    await act(async () => new_view_button(container).click())
    expect(container.querySelector('.table-view-list')).to.equal(null)
  })
})
