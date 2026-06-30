import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import TableCell from '../src/table-cell/table-cell.js'
import { table_context } from '../src/table-context.js'

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

// A percentile band that would color any in-band numeric value, used to prove a
// null cell is NOT colored while a real 0 is.
const percentile_band = { min: 0, p25: 5, p75: 10, max: 20 }

const render_cell = async ({ value, columnDef = {}, percentiles = {} }) => {
  const column = {
    id: 'stat',
    columnDef: {
      id: 'stat',
      column_id: 'stat',
      index: 0,
      accessorKey: 'stat',
      ...columnDef
    },
    getSize: () => 100,
    parent: undefined
  }
  const table = {
    getAllLeafColumns: () => [column],
    getState: () => ({ sort: [] }),
    options: { meta: {} }
  }
  const row = { index: 0, original: { stat: value } }
  const context_value = {
    sticky_left: () => 0,
    enable_duplicate_column_ids: false,
    percentiles
  }

  const container = make_container()
  await act(async () => {
    const root = createRoot(container)
    container._react_root = root
    root.render(
      React.createElement(
        table_context.Provider,
        { value: context_value },
        React.createElement(TableCell, {
          getValue: () => value,
          column,
          row,
          table
        })
      )
    )
  })
  return container
}

describe('TableCell null rendering', () => {
  it('renders a null cell blank when no render_null hook is set', async () => {
    const container = await render_cell({ value: null })
    expect(container.querySelector('.cell-content').textContent).to.equal('')
  })

  it('still renders a real 0', async () => {
    const container = await render_cell({ value: 0 })
    expect(container.querySelector('.cell-content').textContent).to.equal('0')
  })

  it('invokes columnDef.render_null for a null cell', async () => {
    const container = await render_cell({
      value: null,
      columnDef: { render_null: () => 'BYE' }
    })
    expect(container.querySelector('.cell-content').textContent).to.equal('BYE')
  })

  it('does not apply percentile color to a null cell', async () => {
    const container = await render_cell({
      value: null,
      percentiles: { stat: percentile_band }
    })
    expect(container.querySelector('.cell').style.backgroundColor).to.equal('')
  })
})
