import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import './helpers/stub-uninstalled-peers.js' // Table reaches peers this repo does not install
import { describe, it, before, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import Table from '../src/table/table.js'

// Chart columns are table state: a view that carries them reopens with its
// chart ready, and selecting one writes state rather than component memory.

const all_columns = {
  player_name: {
    column_id: 'player_name',
    column_name: 'player_name',
    header_label: 'Name',
    accessorKey: 'player_name',
    data_type: 2
  },
  player_age: {
    column_id: 'player_age',
    column_name: 'player_age',
    header_label: 'Age',
    accessorKey: 'player_age',
    data_type: 1
  },
  player_points: {
    column_id: 'player_points',
    column_name: 'player_points',
    header_label: 'Points',
    accessorKey: 'player_points',
    data_type: 1
  }
}

const data = [
  { player_name: 'A', player_age: 24, player_points: 180 },
  { player_name: 'B', player_age: 29, player_points: 120 }
]

const columns = ['player_name', 'player_age', 'player_points']

let _containers = []

const render_table = async (props) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  _containers.push(container)
  const root = createRoot(container)
  container._react_root = root
  await act(async () => {
    root.render(<Table all_columns={all_columns} data={data} {...props} />)
  })
  return container
}

const find_by_text = (container, text) =>
  [...container.querySelectorAll('div')].find(
    (element) => element.textContent === text && !element.children.length
  )

before(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

afterEach(async () => {
  for (const container of _containers) {
    if (container._react_root) {
      await act(async () => {
        container._react_root.unmount()
      })
    }
    container.remove()
  }
  _containers = []
})

describe('table chart columns', () => {
  it('offers the scatter plot when the saved state carries both axes', async () => {
    const container = await render_table({
      table_state: {
        columns,
        scatter_plot_columns: {
          x: { column_id: 'player_age', column_index: 0 },
          y: { column_id: 'player_points', column_index: 0 }
        }
      }
    })
    expect(find_by_text(container, 'Show Plot')).to.not.equal(undefined)
  })

  it('does not offer the scatter plot when an axis names a removed column', async () => {
    const container = await render_table({
      table_state: {
        columns: ['player_name', 'player_age'],
        scatter_plot_columns: {
          x: { column_id: 'player_age', column_index: 0 },
          y: { column_id: 'player_points', column_index: 0 }
        }
      }
    })
    expect(find_by_text(container, 'Show Plot')).to.equal(undefined)
  })

  it('offers the bar chart when the saved state carries its column', async () => {
    const container = await render_table({
      table_state: {
        columns,
        bar_chart_column: { column_id: 'player_points', column_index: 0 }
      }
    })
    expect(find_by_text(container, 'Show Bar Chart')).to.not.equal(undefined)
  })

  it('writes an axis selection to table state as a display-only change', async () => {
    const changes = []
    const container = await render_table({
      table_state: {
        columns,
        scatter_plot_columns: {
          y: { column_id: 'player_age', column_index: 0 }
        }
      },
      on_view_change: ({ table_state }, change_params) =>
        changes.push({ table_state, change_params })
    })

    const header = [...container.querySelectorAll('.header .cell')].find(
      (cell) => cell.textContent.includes('Points')
    )
    await act(async () => {
      header.click()
    })
    await act(async () => {
      find_by_text(document.body, 'Select for scatter plot X').click()
    })

    const change = changes.at(-1)
    expect(change.change_params).to.deep.equal({
      view_state_changed: true,
      is_display_only_change: true
    })
    expect(change.table_state.scatter_plot_columns).to.deep.equal({
      y: { column_id: 'player_age', column_index: 0 },
      x: { column_id: 'player_points', column_index: 0 }
    })
  })

  it('clears the bar chart column when its selected column is clicked again', async () => {
    const changes = []
    const container = await render_table({
      table_state: {
        columns,
        bar_chart_column: { column_id: 'player_points', column_index: 0 }
      },
      on_view_change: ({ table_state }, change_params) =>
        changes.push({ table_state, change_params })
    })

    const header = [...container.querySelectorAll('.header .cell')].find(
      (cell) => cell.textContent.includes('Points')
    )
    await act(async () => {
      header.click()
    })
    await act(async () => {
      find_by_text(document.body, 'Unselect for bar chart').click()
    })

    const change = changes.at(-1)
    expect(change.table_state).to.not.have.property('bar_chart_column')
    expect(change.table_state.columns).to.deep.equal(columns)
  })
})
