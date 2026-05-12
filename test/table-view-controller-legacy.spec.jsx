import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

// Stub heavy dependencies before importing the component so that babel's
// require hooks can load them without hitting native ESM/directory-index
// resolution issues in the test environment.
const Module = require('module')
const _resolve_orig = Module._resolveFilename.bind(Module)
Module._resolveFilename = function (request, parent, ...args) {
  if (request === '#src/table-view-modal') {
    return require.resolve('../src/table-view-modal/table-view-modal.js')
  }
  if (request === '#src/table-context') {
    return require.resolve('../src/table-context.js')
  }
  if (request === '#src/utils') {
    return require.resolve('../src/utils/index.js')
  }
  return _resolve_orig(request, parent, ...args)
}

// Now it is safe to load the component — babel/require resolves #src/* via
// the patched resolver above.
const TableViewController =
  require('../src/table-view-controller/table-view-controller').default
const { table_context } = require('../src/table-context.js')

// Restore resolver after loading to avoid polluting other tests
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

const LEGACY_VIEWS = [
  {
    view_id: 'view-1',
    view_name: 'All Players',
    view_username: 'alice',
    view_description: 'Basic player table'
  },
  {
    view_id: 'view-2',
    view_name: 'QB Stats',
    view_username: 'system',
    view_description: 'Quarterback statistics'
  }
]

const SELECTED_VIEW = LEGACY_VIEWS[0]

const ctx_val = { table_username: null, all_columns: {} }

const wrap = (el) =>
  React.createElement(table_context.Provider, { value: ctx_val }, el)

const legacy_props = {
  select_view: () => {},
  selected_view: SELECTED_VIEW,
  views: LEGACY_VIEWS,
  on_view_change: () => {},
  delete_view: () => {}
}

describe('TableViewController — legacy flat-list shape (no org props)', () => {
  it('renders without crashing when only legacy props are supplied', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    expect(
      container.querySelector('.table-view-controller-container')
    ).to.not.equal(null)
  })

  it('renders collapsed trigger button with current view name', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    const button = container.querySelector('.table-expanding-control-button')
    expect(button).to.not.equal(null)
    expect(button.textContent).to.include(SELECTED_VIEW.view_name)
  })

  it('does not render org rail in collapsed state', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    expect(container.querySelector('.tvc-rail')).to.equal(null)
  })

  it('opens flat view list when trigger is clicked', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    const list = container.querySelector('.table-view-list')
    expect(list).to.not.equal(null)
    const items = list.querySelectorAll('.table-view-item')
    expect(items.length).to.equal(LEGACY_VIEWS.length)
  })

  it('marks the selected view with -selected class', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    const selected = container.querySelector('.table-view-item.-selected')
    expect(selected).to.not.equal(null)
    expect(selected.textContent).to.include(SELECTED_VIEW.view_name)
  })

  it('does not render org rail when opened without table_username in context', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    expect(container.querySelector('.tvc-rail')).to.equal(null)
  })

  it('does not render CurrentViewHeader when no org props are supplied', async () => {
    const container = make_container()
    await render(
      wrap(React.createElement(TableViewController, legacy_props)),
      container
    )
    await act(async () =>
      container.querySelector('.table-expanding-control-button').click()
    )
    expect(container.querySelector('.tvc-current-view-header')).to.equal(null)
  })
})
