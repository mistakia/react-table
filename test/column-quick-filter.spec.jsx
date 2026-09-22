import './helpers/resolve-src-imports.js' // must precede any #src/* component import

import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import ColumnQuickFilter from '../src/column-quick-filter/column-quick-filter.js'
import { table_context } from '../src/table-context.js'
import { TABLE_DATA_TYPES } from '../src/constants.mjs'

// These specs assert the `where` array the panel EMITS, not that a component
// mounted. The emitted rows are the whole contract -- everything downstream,
// including the four consumers that read a where index, sees only them.

const containers = []

// The harness holds table_state for real and feeds each commit back in. A
// static table_state would let a second interaction resolve against the state
// before the first, which is exactly the case these specs exist to check.
const mount = async ({
  table_state: initial_table_state,
  all_columns = {},
  on_table_state_change = () => {},
  ...props
}) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  containers.push({ container, root })

  const Harness = () => {
    const [table_state, set_table_state] = React.useState(initial_table_state)
    return (
      <table_context.Provider
        value={{
          table_state,
          on_table_state_change: (next) => {
            set_table_state(next)
            on_table_state_change(next)
          },
          all_columns,
          set_filter_controls_open: () => {}
        }}>
        <ColumnQuickFilter {...props} />
      </table_context.Provider>
    )
  }

  await act(async () => {
    root.render(<Harness />)
  })

  return container
}

afterEach(async () => {
  for (const { container, root } of containers.splice(0)) {
    await act(async () => root.unmount())
    container.remove()
  }
})

const find_by_text = (container, text) =>
  [...container.querySelectorAll('div')].find(
    (node) => node.textContent.trim() === text
  )

// React's useId emits ids like `:r0:`, which are legal HTML ids but not legal
// CSS selectors, so the label's `for` cannot be fed to querySelector. Walk up
// to the shared form control instead.
const find_input_by_label = (container, label) => {
  const label_node = [...container.querySelectorAll('label')].find(
    (node) => node.textContent.trim() === label
  )
  if (!label_node) return null
  return label_node.closest('.MuiFormControl-root')?.querySelector('input')
}

// A typed commit is debounced, so a spec that asserts immediately after the
// change event reads nothing. Drive the timer rather than sleeping.
const type_and_settle = async (input, value) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set
    setter.call(input, value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
  })
}

describe('ColumnQuickFilter', () => {
  it('writes a min-only bound as one >= row', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await type_and_settle(find_input_by_label(container, 'Min'), '25')

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_age', operator: '>=', value: 25 }
    ])
  })

  it('writes a max-only bound as one <= row', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await type_and_settle(find_input_by_label(container, 'Max'), '30')

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_age', operator: '<=', value: 30 }
    ])
  })

  it('adds the second bound of a range beside the first', async () => {
    let emitted = null
    const container = await mount({
      table_state: {
        where: [{ column_id: 'player_age', operator: '>=', value: 25 }]
      },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await type_and_settle(find_input_by_label(container, 'Max'), '30')

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_age', operator: '>=', value: 25 },
      { column_id: 'player_age', operator: '<=', value: 30 }
    ])
  })

  it('clears a bound when its input is emptied', async () => {
    let emitted = null
    const container = await mount({
      table_state: {
        where: [
          { column_id: 'player_name', operator: '=', value: 'Allen' },
          { column_id: 'player_age', operator: '>=', value: 25 }
        ]
      },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await type_and_settle(find_input_by_label(container, 'Min'), '')

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_name', operator: '=', value: 'Allen' }
    ])
  })

  it('writes a null check with no value field', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await act(async () => {
      find_by_text(container, 'Is empty').click()
    })

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_age', operator: 'IS NULL' }
    ])
  })

  it('writes a case-insensitive contains for TEXT', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_name',
      data_type: TABLE_DATA_TYPES.TEXT
    })

    await type_and_settle(find_input_by_label(container, 'Contains'), 'allen')

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_name', operator: 'ILIKE', value: 'allen' }
    ])
  })

  it('writes a value set as one IN row for SELECT', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      all_columns: {
        player_position: { column_values: ['QB', 'RB', 'WR'] }
      },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_position',
      data_type: TABLE_DATA_TYPES.SELECT
    })

    await act(async () => {
      find_by_text(container, 'QB').click()
    })

    expect(emitted.where).to.deep.equal([
      { column_id: 'player_position', operator: 'IN', value: ['QB'] }
    ])
  })

  it('writes a boolean as one = row and clears it on Any', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_is_active',
      data_type: TABLE_DATA_TYPES.BOOLEAN
    })

    await act(async () => {
      find_by_text(container, 'True').click()
    })
    expect(emitted.where).to.deep.equal([
      { column_id: 'player_is_active', operator: '=', value: true }
    ])

    await act(async () => {
      find_by_text(container, 'Any').click()
    })
    expect(emitted.where).to.deep.equal([])
  })

  it('writes params and column_index onto a duplicated column instance', async () => {
    let emitted = null
    const container = await mount({
      table_state: { where: [] },
      on_table_state_change: (next) => {
        emitted = next
      },
      column_id: 'player_age',
      column_index: 1,
      params: { year: [2024] },
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    await type_and_settle(find_input_by_label(container, 'Min'), '25')

    expect(emitted.where).to.deep.equal([
      {
        column_id: 'player_age',
        operator: '>=',
        value: 25,
        column_index: 1,
        params: { year: [2024] }
      }
    ])
  })

  // `undefined` is reachable: a consumer can set a data_type constant that does
  // not exist, and that column must still get a menu rather than losing its
  // Filter entry.
  it('renders only the advanced link for a data type with no body', async () => {
    const container = await mount({
      table_state: { where: [] },
      column_id: 'player_something',
      data_type: undefined
    })

    expect(container.querySelector('input')).to.equal(null)
    expect(find_by_text(container, 'Advanced filter')).to.not.equal(undefined)
  })

  it('reports a row it cannot represent rather than repairing it', async () => {
    const container = await mount({
      table_state: {
        where: [
          { column_id: 'player_age', operator: '>=', value: 25 },
          { column_id: 'player_age', operator: '>', value: 40 }
        ]
      },
      column_id: 'player_age',
      data_type: TABLE_DATA_TYPES.NUMBER
    })

    expect(container.textContent).to.contain(
      '1 filter on this column is not shown here.'
    )
  })
})
