import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// Same `#src/*` resolver patch as table-view-controller-legacy.spec.jsx: the
// package's imports field maps extensionless subpaths that Node's strict
// resolver rejects under CJS.
const path = require('path')
const fs = require('fs')
const Module = require('module')
const _resolve_orig = Module._resolveFilename.bind(Module)
const src_root = path.resolve(__dirname, '../src')
Module._resolveFilename = function (request, parent, ...args) {
  if (request.startsWith('#src/')) {
    const base = path.join(src_root, request.slice('#src/'.length))
    const candidates = [base, `${base}.js`, path.join(base, 'index.js')]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    }
  }
  return _resolve_orig(request, parent, ...args)
}

const TableViewController =
  require('../src/table-view-controller/table-view-controller').default
const { table_context } = require('../src/table-context.js')

Module._resolveFilename = _resolve_orig

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
      await act(async () => c._react_root.unmount())
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

const VIEWS = [
  {
    view_id: 'view-1',
    view_name: 'All Players',
    view_username: 'alice',
    view_description: 'Basic player table',
    table_state: { columns: ['player_name'], sort: [], where: [] },
    // Consumer-attached fields a new view must NOT inherit.
    search: { type: 'client', fields: ['player_name'], key_field: 'pid' },
    is_editable: true,
    is_table_state_changed: true
  }
]

const SELECTED_VIEW = VIEWS[0]

const wrap = (el) =>
  React.createElement(
    table_context.Provider,
    { value: { table_username: 'alice', all_columns: {} } },
    el
  )

const base_props = {
  select_view: () => {},
  selected_view: SELECTED_VIEW,
  views: VIEWS,
  on_view_change: () => {},
  delete_view: () => {},
  new_view_prefix_columns: ['player_name']
}

const render_controller = async (props = {}) => {
  const container = make_container()
  await render(
    wrap(React.createElement(TableViewController, { ...base_props, ...props })),
    container
  )
  return container
}

describe('TableViewController — new view', () => {
  it('renders a labelled new view button outside the current-view card', async () => {
    const container = await render_controller()
    expect(container.querySelector('.table-view-list')).to.equal(null)

    const button = container.querySelector('.table-view-new-view-button')
    expect(button).to.not.equal(null)
    // The label must be readable without hovering for a tooltip.
    expect(button.textContent).to.equal('New view')
    // And it must not sit inside the card, whose other controls all act on the
    // view currently selected.
    expect(
      container
        .querySelector('.table-expanding-control-button')
        .contains(button)
    ).to.equal(false)
  })

  it('creates a fresh empty view seeded with the new-view prefix columns', async () => {
    const calls = []
    const container = await render_controller({
      on_view_change: (view, params) => calls.push({ view, params })
    })

    await act(async () =>
      container.querySelector('.table-view-new-view-button').click()
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
    const container = await render_controller({
      on_view_change: (view, params) => calls.push({ view, params })
    })

    await act(async () =>
      container.querySelector('.table-view-new-view-button').click()
    )

    const { view } = calls[0]
    expect(view.search).to.equal(undefined)
    expect(view.is_editable).to.equal(undefined)
    expect(view.is_table_state_changed).to.equal(undefined)
  })

  it('leaves the panel closed when creating from the collapsed header', async () => {
    const container = await render_controller()
    await act(async () =>
      container.querySelector('.table-view-new-view-button').click()
    )
    expect(container.querySelector('.table-view-list')).to.equal(null)
  })

  it('offers creation inside the open panel, and closes it on create', async () => {
    const container = await render_controller()
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    expect(container.querySelector('.table-view-list')).to.not.equal(null)

    const panel_button = container.querySelector(
      '.table-view-header-new-view-button'
    )
    expect(panel_button).to.not.equal(null)
    expect(panel_button.textContent).to.equal('New view')

    await act(async () => panel_button.click())
    expect(container.querySelector('.table-view-list')).to.equal(null)
  })

  it('omits both buttons when create is disabled', async () => {
    const container = await render_controller({ disable_create_view: true })
    expect(container.querySelector('.table-view-new-view-button')).to.equal(
      null
    )
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    expect(
      container.querySelector('.table-view-header-new-view-button')
    ).to.equal(null)
  })
})
