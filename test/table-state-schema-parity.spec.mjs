import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, it } from 'mocha'
import { expect } from 'chai'

import { SCHEMAS } from '../src/validators/schema-resolver.mjs'
import { validate_table_state } from '../src/validators/index.mjs'

// The table state has TWO schema copies under one $id: the published JSON file
// consumers read, and the bundled object the runtime validator compiles. They
// drifted apart once already -- the published file omitted row_grain while the
// component read table_state.row_grain[0] and league emitted it -- so the
// property sets are asserted equal rather than each maintained by hand.

const test_dir = path.dirname(fileURLToPath(import.meta.url))
const published_schema = JSON.parse(
  fs.readFileSync(
    path.join(test_dir, '../schema/state/table-state.json'),
    'utf8'
  )
)

describe('table-state schema', () => {
  it('published file and bundled validator declare the same $id', () => {
    expect(published_schema.$id).to.equal(SCHEMAS['table-state'].$id)
  })

  it('published file and bundled validator declare the same properties', () => {
    expect(Object.keys(published_schema.properties).sort()).to.deep.equal(
      Object.keys(SCHEMAS['table-state'].properties).sort()
    )
  })

  it('declares row_grain as an array of strings', () => {
    for (const schema of [published_schema, SCHEMAS['table-state']]) {
      expect(schema.properties.row_grain.type).to.equal('array')
      expect(schema.properties.row_grain.items.type).to.equal('string')
    }
  })

  it('accepts a row_grain array', () => {
    expect(validate_table_state({ row_grain: ['player'] }).valid).to.equal(true)
  })

  it('rejects a row_grain that is a bare string', () => {
    const result = validate_table_state({ row_grain: 'player' })
    expect(result.valid).to.equal(false)
    expect(result.errors.join(' ')).to.include('row_grain')
  })
})
