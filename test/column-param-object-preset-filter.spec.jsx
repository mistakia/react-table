import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// The package's `imports` field maps `#src/*` -> `./src/*` without
// extensions, which Node's strict subpath-imports resolver rejects under
// CJS. Patch _resolveFilename to translate `#src/<sub>` into a concrete
// `src/<sub>` path with `.js` / `index.js` resolution, so babel-register
// can transform the file.
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

const ColumnParamObjectPresetFilter =
  require('../src/column-param-object-preset-filter/column-param-object-preset-filter').default

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

// FilterBase keeps its body in a Popper behind internal `visible` state, so the
// chips do not exist in the DOM until the trigger is clicked. The body renders
// into a portal on document.body rather than into the container.
const open_filter = async (container) => {
  const trigger = container.querySelector('.table-filter-item')
  await act(async () => {
    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })
}

const column_specs = [
  { key: 'rb', label: 'RB' },
  { key: 'te', label: 'TE' },
  { key: 'wr', label: 'WR' }
]

const make_definition = (preset_values) => ({
  label: 'Offense Personnel',
  column_specs,
  preset_values
})

const default_props = {
  column_param_name: 'offense_personnel',
  handle_change: () => {}
}

describe('ColumnParamObjectPresetFilter', () => {
  // Regression: `resolve_count` once read only a `counts` prop, which
  // `ParametersEditorItem` has no channel to pass -- it builds a fixed
  // `param_props` shape. Live counts arrive on the preset itself as `n`, so
  // reading anything else renders every chip label-only no matter what the
  // param-option-counts endpoint returned.
  it('renders the live count from preset.n', async () => {
    const container = make_container()
    await render(
      <ColumnParamObjectPresetFilter
        {...default_props}
        column_param_definition={make_definition([
          { label: '11 Personnel', value: { rb: 1, te: 1, wr: 3 }, n: 261477 }
        ])}
        selected_param_values={null}
      />,
      container
    )
    await open_filter(container)
    const chip_count = document.querySelector('.chip-count')
    expect(chip_count, 'no .chip-count rendered').to.not.equal(null)
    expect(chip_count.textContent).to.equal((261477).toLocaleString())
  })

  it('renders label-only when the preset carries no count', async () => {
    const container = make_container()
    await render(
      <ColumnParamObjectPresetFilter
        {...default_props}
        column_param_definition={make_definition([
          { label: '11 Personnel', value: { rb: 1, te: 1, wr: 3 } }
        ])}
        selected_param_values={null}
      />,
      container
    )
    await open_filter(container)
    expect(document.body.textContent).to.include('11 Personnel')
    expect(document.querySelector('.chip-count')).to.equal(null)
  })
})
