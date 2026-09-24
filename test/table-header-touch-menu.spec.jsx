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

const make_column = ({ column_id, index = 0 }) => ({
  id: column_id,
  parent: undefined,
  columns: [],
  columnDef: {
    id: column_id,
    column_id,
    index,
    accessorKey: column_id,
    header_label: column_id
  },
  getIsResizing: () => false,
  getSize: () => 120
})

const render_header = async () => {
  const container = make_container()
  const sort_calls = []
  const column = make_column({ column_id: 'player_age' })

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
    table_state: { columns: ['player_age'], prefix_columns: [] },
    set_column_controls_open: () => {},
    set_filter_controls_open: () => {},
    set_table_sort: (args) => sort_calls.push(args),
    set_column_hidden_by_index: () => {},
    set_filters_local_table_state: () => {},
    sticky_left: () => undefined,
    is_sticky_column: () => false,
    selected_scatter_columns: {},
    set_selected_scatter_column: () => {},
    set_selected_bar_chart_column: () => {},
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

  // ClickAwayListener arms itself on a macrotask, so a touch dispatched before
  // this resolves is ignored and the test would pass against the bug.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  const cell = container.querySelector('.cell')
  await act(async () => {
    cell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })

  return { container, sort_calls }
}

const find_menu_button = (label) =>
  Array.from(document.querySelectorAll('.header-menu-item-button')).find(
    (node) => node.textContent.includes(label)
  )

describe('table-header - menu on touch', function () {
  // A tap is touchend followed by click. The menu Popper portals to body, so
  // if it sits outside the ClickAwayListener's wrapped node the away handler
  // judges the tap "away" and unmounts the item on touchend — the click then
  // has no connected target and the action never runs. Mobile Safari only:
  // on desktop the away handler is a document click that runs after React's.
  it('applies the sort when the item is tapped, not clicked', async function () {
    const { sort_calls } = await render_header()

    const sort_ascending = find_menu_button('Sort ascending')
    expect(sort_ascending, 'menu offers Sort ascending').to.exist

    await act(async () => {
      sort_ascending.dispatchEvent(
        new window.Event('touchend', { bubbles: true })
      )
    })

    expect(
      document.contains(sort_ascending),
      'touchend inside the menu does not dismiss it'
    ).to.equal(true)

    await act(async () => {
      sort_ascending.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })

    expect(sort_calls).to.deep.equal([
      { column_id: 'player_age', column_index: 0, desc: false, multi: false }
    ])
  })

  it('dismisses the menu once a sort has been chosen', async function () {
    await render_header()

    await act(async () => {
      find_menu_button('Sort descending').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true })
      )
    })

    expect(find_menu_button('Sort descending'), 'menu closed after the action')
      .to.not.exist
  })
})
