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

const render_cell = async ({
  value,
  columnDef = {},
  percentiles = {},
  tableState = { sort: [] }
}) => {
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
    getState: () => tableState,
    options: { meta: {} }
  }
  const row = { index: 0, original: { stat: value } }
  const context_value = {
    sticky_left: () => 0,
    is_sticky_column: () => false,
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

describe('TableCell justify_content', () => {
  it('applies columnDef.justify_content as the cell inline justify-content', async () => {
    const container = await render_cell({
      value: 'a long play description',
      columnDef: { justify_content: 'flex-start' }
    })
    expect(container.querySelector('.cell').style.justifyContent).to.equal(
      'flex-start'
    )
  })

  it('sets no inline justify-content without a declaration (the .cell rule centers)', async () => {
    const container = await render_cell({ value: 'text' })
    expect(container.querySelector('.cell').style.justifyContent).to.equal('')
  })
})

describe('TableCell with a sort-less table_state', () => {
  // Signal 129436: `Cannot read properties of undefined (reading 'find')` from
  // the react-table vendor chunk. A view whose table_state has no `sort` key --
  // e.g. one restored from a browser snapshot that predates a default, or a
  // prefix-only view -- reached `sort.find` with `sort` undefined and threw,
  // taking the whole page body down. `sort` is an optional state key
  // (table-state schema has no `required`), and every other read of it in the
  // library already guards with `|| []`; the cell did not.
  it('renders when table.getState() has no sort key', async () => {
    const container = await render_cell({ value: 'text', tableState: {} })
    expect(container.querySelector('.cell-content').textContent).to.equal(
      'text'
    )
  })

  it('treats an explicitly undefined sort the same way', async () => {
    const container = await render_cell({
      value: 'text',
      tableState: { sort: undefined }
    })
    expect(container.querySelector('.cell-content').textContent).to.equal(
      'text'
    )
  })

  it('still honors an empty sort array', async () => {
    const container = await render_cell({
      value: 'text',
      tableState: { sort: [] }
    })
    expect(container.querySelector('.cell-content').textContent).to.equal(
      'text'
    )
  })
})
