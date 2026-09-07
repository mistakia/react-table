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

describe('new view button', () => {
  it('renders in the toolbar, outside the current-view card', async () => {
    const container = await render_table()

    const button = container.querySelector('.table-new-view-button')
    expect(button).to.not.equal(null)

    // A native button on the lib's shared ghost treatment, not a MUI one --
    // see STYLE.md. The class is what makes it match the Columns and Filters
    // triggers, so assert on it rather than on the rendered CSS.
    expect(button.tagName).to.equal('BUTTON')
    expect(button.classList.contains('rt-button')).to.equal(true)
    expect(button.className).to.not.match(/Mui/)

    // The label must be readable without hovering for a tooltip. The leading
    // glyph is aria-hidden, so it is decoration rather than part of the name.
    expect(button.textContent).to.equal('+New view')
    expect(
      button.querySelector('.rt-button-glyph').getAttribute('aria-hidden')
    ).to.equal('true')

    // It lives in the toolbar row, not in the card -- every control inside the
    // card acts on the view currently selected, which is what made the old
    // placement read as an action on that view.
    expect(
      container
        .querySelector('.table-search-and-controls-container')
        .contains(button)
    ).to.equal(true)
    // Directly after the ellipsis menu, at the head of the row.
    expect(
      button.previousElementSibling.classList.contains('table-menu-container')
    ).to.equal(true)
    expect(
      container
        .querySelector('.table-view-controller-container')
        .contains(button)
    ).to.equal(false)
  })

  it('is hidden on a view that has never been saved', async () => {
    const container = await render_table({ saved_table_state: null })
    expect(container.querySelector('.table-new-view-button')).to.equal(null)
  })

  it('is hidden when the consumer disables view creation', async () => {
    const container = await render_table({ disable_create_view: true })
    expect(container.querySelector('.table-new-view-button')).to.equal(null)
  })

  it('creates a fresh view seeded with the new-view prefix columns', async () => {
    const calls = []
    const container = await render_table({
      on_view_change: (view, params) => calls.push({ view, params })
    })

    await act(async () =>
      container.querySelector('.table-new-view-button').click()
    )

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

    await act(async () =>
      container.querySelector('.table-new-view-button').click()
    )

    const { view } = calls[0]
    expect(view.search).to.equal(undefined)
    expect(view.is_editable).to.equal(undefined)
  })

  it('offers creation inside the open view panel too, on the same treatment', async () => {
    const container = await render_table()
    await act(async () =>
      container
        .querySelector('.table-view-controller .table-expanding-control-button')
        .click()
    )

    const panel_button = container.querySelector(
      '.table-view-header-new-view-button'
    )
    expect(panel_button).to.not.equal(null)
    expect(panel_button.tagName).to.equal('BUTTON')
    expect(panel_button.classList.contains('rt-button')).to.equal(true)
    expect(panel_button.textContent).to.equal('+New view')
  })

  it('withholds the panel button on a view that has never been saved', async () => {
    const container = await render_table({ saved_table_state: null })
    await act(async () =>
      container
        .querySelector('.table-view-controller .table-expanding-control-button')
        .click()
    )

    expect(container.querySelector('.table-view-list')).to.not.equal(null)
    expect(
      container.querySelector('.table-view-header-new-view-button')
    ).to.equal(null)
  })
})
