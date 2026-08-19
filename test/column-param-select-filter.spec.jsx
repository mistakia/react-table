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

const ColumnParamSelectFilter =
  require('../src/column-param-select-filter/column-param-select-filter').default
const { TABLE_DATA_TYPES } = require('../src/constants.mjs')

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

const param_definition = {
  label: 'Season Type',
  values: ['PRE', 'REG', 'POST'],
  data_type: TABLE_DATA_TYPES.SELECT,
  dynamic_values: []
}

const default_props = {
  column_param_name: 'seas_type',
  column_param_definition: param_definition
}

describe('ColumnParamSelectFilter', () => {
  it('renders an array selected_param_values without crashing', async () => {
    const container = make_container()
    await render(
      <ColumnParamSelectFilter
        {...default_props}
        selected_param_values={['REG']}
      />,
      container
    )
    expect(container.textContent).to.not.be.empty
  })

  // Regression: a stored scalar param value (a legacy view, a malformed
  // table_state) used to crash the filter via `selected_param_values?.forEach`
  // inside a useEffect, blanking the whole page. The scalar must render as that
  // single value instead.
  it('renders a scalar selected_param_values as that single value instead of crashing', async () => {
    const container = make_container()
    await render(
      <ColumnParamSelectFilter
        {...default_props}
        selected_param_values='REG'
      />,
      container
    )
    expect(container.textContent).to.not.be.empty
    expect(container.textContent).to.contain('REG')
  })
})
