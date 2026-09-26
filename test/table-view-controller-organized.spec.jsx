import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// See table-view-controller-legacy.spec.jsx: resolve `#src/*` for CJS.
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

afterEach(async () => {
  for (const c of _containers) {
    if (c._react_root) await act(async () => c._react_root.unmount())
    c.remove()
  }
  _containers = []
})

const VIEWS = [
  {
    view_id: 'shared-1',
    view_name: 'Bob View',
    view_username: 'bob',
    view_description: ''
  },
  {
    view_id: 'system-1',
    view_name: 'QB Stats',
    view_username: 'system',
    view_description: ''
  },
  {
    view_id: 'mine-1',
    view_name: 'Alice View',
    view_username: 'alice',
    view_description: 'Mine',
    is_editable: true,
    is_table_state_changed: true
  }
]

const host_map = () =>
  React.createElement('div', { className: 'host-map' }, 'Map')

const mount = async ({ username = 'alice', views = VIEWS, ...props } = {}) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  _containers.push(container)
  await act(async () => {
    const root = createRoot(container)
    container._react_root = root
    root.render(
      React.createElement(
        table_context.Provider,
        { value: { table_username: username, all_columns: {} } },
        React.createElement(TableViewController, {
          select_view: () => {},
          selected_view: views.find((v) => v.view_id === 'mine-1') || views[0],
          views,
          on_view_change: () => {},
          delete_view: () => {},
          favorite_view_ids: new Set(),
          tags_by_view_id: new Map(),
          ...props
        })
      )
    )
  })
  return container
}

const open = async (container) =>
  act(async () =>
    container.querySelector('.table-expanding-control-button').click()
  )

const active_section = (container) =>
  container.querySelector('.tvc-rail-section.-active .tvc-rail-section-label')
    .textContent

const rail_count = (container, label) => {
  const button = [...container.querySelectorAll('.tvc-rail-section')].find(
    (b) => b.querySelector('.tvc-rail-section-label').textContent === label
  )
  return button
    ? Number(button.querySelector('.tvc-rail-section-count').textContent)
    : null
}

describe('TableViewController — organized panel', () => {
  it('opens on System when the host renders its system views', async () => {
    const container = await mount({ render_system_views: host_map })
    await open(container)
    expect(active_section(container)).to.equal('System')
    expect(container.querySelector('.table-view-list .host-map')).to.not.equal(
      null
    )
  })

  it('opens on All when the host renders no map', async () => {
    const container = await mount()
    await open(container)
    expect(active_section(container)).to.equal('All')
  })

  it('stacks All as Yours, then System, then Shared', async () => {
    const container = await mount({ render_system_views: host_map })
    await open(container)
    const all = [...container.querySelectorAll('.tvc-rail-section')].find((b) =>
      b.textContent.startsWith('All')
    )
    await act(async () => all.click())
    const groups = [...container.querySelectorAll('.table-view-list-group')]
    expect(
      groups.map(
        (g) => g.querySelector('.table-view-list-group-label').textContent
      )
    ).to.deep.equal(['Yours', 'System', 'Shared'])
    expect(groups[0].textContent).to.include('Alice View')
    expect(groups[1].querySelector('.host-map')).to.not.equal(null)
    expect(groups[2].textContent).to.include('Bob View')
  })

  // The host map replaces the system rows everywhere, so By author must not
  // count them: an anonymous reader saw "By author 44" open onto nothing.
  it('leaves host-rendered system views out of the By author count', async () => {
    const container = await mount({ render_system_views: host_map })
    await open(container)
    expect(rail_count(container, 'All')).to.equal(3)
    expect(rail_count(container, 'By author')).to.equal(2)
  })

  it('hides By author when only system views exist', async () => {
    const container = await mount({
      username: null,
      views: [VIEWS[1]],
      render_system_views: host_map
    })
    await open(container)
    expect(rail_count(container, 'By author')).to.equal(null)
  })

  it('shows every action on the collapsed card', async () => {
    const container = await mount({
      on_toggle_favorite: () => {},
      on_save_current_view: () => {},
      on_reset_current_view: () => {},
      on_add_user_tag: () => {},
      on_remove_user_tag: () => {},
      on_create_new_view: () => {}
    })
    expect(container.querySelector('.table-view-controller.-open')).to.equal(
      null
    )
    const labels = [
      ...container.querySelectorAll('.current-view-actions .cva-btn')
    ].map((b) => b.getAttribute('aria-label'))
    expect(labels).to.deep.equal([
      'Add to favorites',
      'Reset to saved state',
      'Save current view',
      'Edit tags',
      'Edit view details',
      'Duplicate view',
      'Delete view',
      'New view'
    ])
  })

  it('opens the tag editor from the collapsed card without opening the panel', async () => {
    const container = await mount({
      on_add_user_tag: () => {},
      on_remove_user_tag: () => {}
    })
    const tags = container.querySelector('.current-view-actions .cva-btn.-tags')
    await act(async () => tags.click())
    expect(document.querySelector('.current-view-tags')).to.not.equal(null)
    expect(container.querySelector('.table-view-list')).to.equal(null)
  })
})
