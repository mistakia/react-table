import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// Same `#src/*` resolver patch as column-param-select-filter.spec.jsx: the
// package's `imports` field maps without extensions, which Node's strict
// subpath-imports resolver rejects under CJS.
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

const ParametersEditorConflict =
  require('../src/parameters-editor/parameters-editor-conflict').default
const {
  CONFLICT_REASONS
} = require('../src/utils/resolve-param-definition-across-records.js')

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

const render_conflict = async ({ conflict, param_label }) => {
  const container = make_container()
  await render(
    <ParametersEditorConflict conflict={conflict} param_label={param_label} />,
    container
  )
  return container
}

describe('ParametersEditorConflict', () => {
  it('names both sides of an arity conflict in the user own terms', async () => {
    const container = await render_conflict({
      param_label: 'Year Offset',
      conflict: {
        reason: CONFLICT_REASONS.ARITY,
        field: 'is_single',
        groups: [
          {
            label: 'take a single value',
            column_titles: ['Startable Games (Season)', 'KeepTradeCut Value']
          },
          { label: 'take a range', column_titles: ['Games Played'] }
        ]
      }
    })

    const text = container.textContent
    expect(text).to.include('Year Offset')
    expect(text).to.include('cannot be set for this selection')
    expect(text).to.include(
      'These columns take a single value: Startable Games (Season), KeepTradeCut Value'
    )
    expect(text).to.include('These columns take a range: Games Played')
    expect(text).to.include('Deselect one group to set this parameter')
    expect(text).to.include('set it on each column individually')
  })

  // The approved copy rule: name the values while they fit, count them when
  // they do not. `time_type` is the short case and `market_type` the long one.
  it('names the values when each side has few of them', async () => {
    const container = await render_conflict({
      param_label: 'Time Type',
      conflict: {
        reason: CONFLICT_REASONS.NO_ADMISSIBLE_VALUES,
        field: 'values',
        groups: [
          { column_titles: ['Game Prop Line'], value: ['OPEN', 'CLOSE'] },
          {
            column_titles: ['Team Seasonlogs Rank'],
            value: ['SEASON', 'LAST_THREE', 'LAST_FOUR', 'LAST_EIGHT']
          }
        ]
      }
    })

    const text = container.textContent
    expect(text).to.include('No value works for every selected column.')
    expect(text).to.include('Game Prop Line accepts OPEN or CLOSE')
    expect(text).to.include(
      'Team Seasonlogs Rank accepts SEASON, LAST_THREE, LAST_FOUR or LAST_EIGHT'
    )
  })

  it('counts the values when a side has too many to name', async () => {
    const container = await render_conflict({
      param_label: 'Market Type',
      conflict: {
        reason: CONFLICT_REASONS.NO_ADMISSIBLE_VALUES,
        field: 'values',
        groups: [
          {
            column_titles: ['Game Prop Line'],
            value: Array.from({ length: 97 }, (_, index) => `MARKET_${index}`)
          },
          {
            column_titles: ['Team Game Prop Line'],
            value: Array.from(
              { length: 25 },
              (_, index) => `TEAM_MARKET_${index}`
            )
          }
        ]
      }
    })

    const text = container.textContent
    expect(text).to.include('Game Prop Line accepts 97 values')
    expect(text).to.include('Team Game Prop Line accepts 25 values')
  })

  it('explains an incompatible control conflict', async () => {
    const container = await render_conflict({
      param_label: 'Output',
      conflict: {
        reason: CONFLICT_REASONS.INCOMPATIBLE_CONTROL,
        field: 'data_type',
        groups: [
          { column_titles: ['Games Played'] },
          { column_titles: ['Month Day'] }
        ]
      }
    })

    const text = container.textContent
    expect(text).to.include(
      'The selected columns edit this parameter with different kinds of control.'
    )
    expect(text).to.include('Games Played')
    expect(text).to.include('Month Day')
  })

  it('falls back to the column id when a title is missing', async () => {
    const container = await render_conflict({
      param_label: 'play_year',
      conflict: {
        reason: CONFLICT_REASONS.ARITY,
        field: 'is_single',
        groups: [
          { label: 'take a single value', column_titles: ['play_year'] },
          { label: 'take a range', column_titles: ['play_week'] }
        ]
      }
    })

    // No label declared, so the heading falls back to the param name.
    expect(container.textContent).to.include('play_year')
  })
})
