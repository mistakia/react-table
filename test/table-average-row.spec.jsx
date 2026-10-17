import './helpers/resolve-src-imports.js' // must precede any #src/* component import
import './helpers/stub-uninstalled-peers.js' // Table reaches peers this repo does not install
import { describe, it, before, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import Table from '../src/table/table.js'
import { format_column_average } from '../src/table-average-row/table-average-row.js'

// These specs read the average row the way a reader does: which cells carry a
// number, and what number. The keying is the contract with the consumer -- a
// value under the wrong key is a blank cell, not an error.

const all_columns = {
  player_name: {
    column_id: 'player_name',
    column_name: 'player_name',
    header_label: 'Name',
    accessorKey: 'player_name',
    data_type: 2
  },
  player_targets: {
    column_id: 'player_targets',
    column_name: 'player_targets',
    header_label: 'Targets',
    accessorKey: 'player_targets',
    data_type: 1
  },
  player_catch_rate: {
    column_id: 'player_catch_rate',
    column_name: 'player_catch_rate',
    header_label: 'Catch rate',
    accessorKey: 'player_catch_rate',
    data_type: 1,
    fixed: 3
  },
  player_team: {
    column_id: 'player_team',
    column_name: 'player_team',
    header_label: 'Team',
    accessorKey: 'player_team',
    data_type: 2
  }
}

const data = [
  {
    player_name: 'A',
    player_targets_0: 40,
    player_targets_1: 4,
    player_catch_rate_0: 0.7,
    player_team_0: 'BUF'
  }
]

let _containers = []

const render_table = async (props) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  _containers.push(container)
  const root = createRoot(container)
  container._react_root = root
  await act(async () => {
    root.render(
      <Table
        all_columns={all_columns}
        enable_duplicate_column_ids
        data={data}
        table_state={{
          columns: [
            'player_targets',
            'player_catch_rate',
            'player_targets',
            'player_team'
          ],
          prefix_columns: ['player_name']
        }}
        {...props}
      />
    )
  })
  return container
}

const average_cells = (container) =>
  [...container.querySelectorAll('.header .average-row .cell')].map((cell) =>
    cell.textContent.trim()
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

describe('table average row', () => {
  it('shows each NUMBER column its own occurrence average and labels the row', async () => {
    const container = await render_table({
      column_averages: {
        player_targets_0: 33.1015,
        player_targets_1: 2.25,
        player_catch_rate_0: 0.66666,
        // The server averages type-agnostically; a non-NUMBER column must not
        // show what it sent.
        player_team_0: 12
      }
    })

    const cells = average_cells(container)
    expect(cells).to.include('Average')
    expect(cells).to.include('33.1')
    expect(cells).to.include('2.3')
    expect(cells).to.include('0.667')
    expect(cells).to.not.include('12.0')
  })

  it('leaves a NUMBER column blank when no average is keyed for it', async () => {
    const container = await render_table({
      column_averages: { player_targets_0: 10 }
    })

    const cells = average_cells(container)
    expect(cells).to.include('10.0')
    expect(cells).to.not.include('NaN')
  })

  it('renders no average row without averages', async () => {
    const without_prop = await render_table({})
    expect(without_prop.querySelectorAll('.average-row')).to.have.length(0)

    const empty = await render_table({ column_averages: {} })
    expect(empty.querySelectorAll('.average-row')).to.have.length(0)
  })

  it('renders no average row over an empty result', async () => {
    const container = await render_table({
      data: [],
      column_averages: { player_targets_0: 10 }
    })
    expect(container.querySelectorAll('.average-row')).to.have.length(0)
  })

  it('formats with the column precision, else one place', () => {
    expect(format_column_average({ value: 33.1015 })).to.equal('33.1')
    expect(format_column_average({ value: 0.66666, fixed: 3 })).to.equal(
      '0.667'
    )
    expect(format_column_average({ value: 12, fixed: 0 })).to.equal('12')
  })
})
