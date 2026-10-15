import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import TableHeader from '../src/table-header/table-header.js'
import { table_context } from '../src/table-context.js'

const containers = []

afterEach(async () => {
  for (const { container, root } of containers.splice(0)) {
    await act(async () => root.unmount())
    container.remove()
  }
})

// A split column is the display column table.js builds per row axis: its id is
// the axis id and it carries no column_id.
const split_column = (row_axis) => ({
  id: row_axis,
  parent: undefined,
  columns: [],
  columnDef: { id: row_axis, header_label: row_axis, is_split: true },
  getIsResizing: () => false,
  getSize: () => 70
})

const open_header_menu = async ({ row_axis, row_axis_values }) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  containers.push({ container, root })

  const column = split_column(row_axis)
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
    getSize: () => 70,
    getResizeHandler: () => () => {}
  }

  await act(async () => {
    root.render(
      <table_context.Provider
        value={{
          table_state: { columns: [], where: [], row_axes: [row_axis] },
          on_table_state_change: () => {},
          set_table_sort: () => {},
          sticky_left: () => undefined,
          is_sticky_column: () => false,
          columns_with_no_data: new Set(),
          all_columns: {},
          row_axis_values
        }}>
        <TableHeader {...{ header, column, table }} />
      </table_context.Provider>
    )
  })

  await act(async () => {
    container
      .querySelector('.cell')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  })
}

const menu_text = () =>
  [...document.querySelectorAll('.header-popper')]
    .map((node) => node.textContent)
    .join('')

describe('table-header - row axis filter', function () {
  it('offers a value filter on a split column the consumer supplies values for', async function () {
    await open_header_menu({
      row_axis: 'year',
      row_axis_values: { year: [2025, 2024] }
    })

    expect(menu_text()).to.include('Exclude the selected values')
    expect(menu_text()).to.include('2024')
    expect(menu_text()).to.not.include('Advanced filter')
  })

  it('offers Min and Max bounds on a split column whose values are numbers', async function () {
    await open_header_menu({
      row_axis: 'year',
      row_axis_values: { year: [2025, 2024] }
    })

    expect(menu_text()).to.include('Min')
    expect(menu_text()).to.include('Max')
  })

  it('offers no bounds on a split column whose values are codes', async function () {
    await open_header_menu({
      row_axis: 'position',
      row_axis_values: { position: ['RB', 'WR'] }
    })

    expect(menu_text()).to.include('RB')
    expect(menu_text()).to.not.include('Min')
  })

  it('offers no filter on a split column with no supplied values', async function () {
    await open_header_menu({
      row_axis: 'week',
      row_axis_values: { year: [2025, 2024] }
    })

    expect(menu_text()).to.not.include('Exclude the selected values')
  })
})
