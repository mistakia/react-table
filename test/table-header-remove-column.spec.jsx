import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import TableHeader from '../src/table-header/table-header.js'
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

// A prefix column is a real leaf column carrying a column_id, but it lives in
// table_state.prefix_columns — never in table_state.columns. The header's
// index resolver is a findIndex over table_state.columns, so for a prefix
// column it can only answer -1, and -1 handed to a splice-by-index removal
// reads an undefined slot.
const make_column = ({ column_id, index = 0, prefix = false }) => ({
  id: prefix ? `prefix-${column_id}` : column_id,
  parent: undefined,
  columns: [],
  columnDef: {
    id: prefix ? `prefix-${column_id}` : column_id,
    column_id,
    index,
    accessorKey: column_id,
    header_label: column_id,
    ...(prefix ? { prefix: true, sticky: true } : {})
  },
  getIsResizing: () => false,
  getSize: () => 120
})

const render_header = async ({ table_state, column }) => {
  const container = make_container()
  const calls = []

  const table = {
    getAllLeafColumns: () => [column],
    getState: () => ({ columnSizingInfo: { deltaOffset: 0 } })
  }
  const header = {
    id: column.id,
    column,
    depth: 1,
    colSpan: 1,
    isPlaceholder: false,
    getSize: () => 120,
    getResizeHandler: () => () => {}
  }

  const context_value = {
    table_state,
    set_column_controls_open: () => {},
    set_filter_controls_open: () => {},
    set_table_sort: () => {},
    set_column_hidden_by_index: (index) => calls.push(index),
    set_filters_local_table_state: () => {},
    sticky_left: () => undefined,
    is_sticky_column: () => false,
    selected_scatter_columns: {},
    set_selected_scatter_column: () => {},
    enable_duplicate_column_ids: false,
    columns_with_no_data: new Set()
  }

  const root = createRoot(container)
  container._react_root = root
  await act(async () => {
    root.render(
      <table_context.Provider value={context_value}>
        <TableHeader {...{ header, column, table }} />
      </table_context.Provider>
    )
  })

  // Open the header popper.
  const cell = container.querySelector('.cell')
  await act(async () => {
    cell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })

  const remove_button = Array.from(
    document.querySelectorAll('.header-menu-item-button')
  ).find((node) => node.textContent.includes('Remove column'))

  return { container, calls, remove_button }
}

describe('table-header - remove column', function () {
  it('removes a regular column by its table_state.columns index', async function () {
    const table_state = {
      columns: ['player_name', 'player_age'],
      prefix_columns: []
    }
    const { calls, remove_button } = await render_header({
      table_state,
      column: make_column({ column_id: 'player_age', index: 1 })
    })

    expect(remove_button, 'regular column offers Remove column').to.exist
    await act(async () => {
      remove_button.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })
    expect(calls).to.deep.equal([1])
  })

  it('does not offer Remove column for a prefix column', async function () {
    const table_state = {
      columns: ['player_age'],
      prefix_columns: ['player_name']
    }
    const { calls, remove_button } = await render_header({
      table_state,
      column: make_column({ column_id: 'player_name', prefix: true })
    })

    expect(remove_button, 'prefix column offers no Remove column').to.not.exist
    expect(calls).to.deep.equal([])
  })
})
