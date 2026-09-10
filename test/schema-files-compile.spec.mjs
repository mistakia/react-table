import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Every schema published under schema/ must be a schema ajv can actually
// compile. Nothing loads these files at runtime -- src/validators bundles its
// own copies -- so an invalid one stays inert until a consumer tries to compile
// the published set, which is how `"type": "function"` survived in
// columns/column-definition.json. These specs make that class fail here first.

const schema_root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../schema'
)

const collect_schema_files = (dir) => {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...collect_schema_files(full))
    } else if (entry.name.endsWith('.json')) {
      found.push(full)
    }
  }
  return found
}

const schema_files = collect_schema_files(schema_root)

describe('published schema files', () => {
  it('finds schema files to check', () => {
    expect(schema_files.length).to.be.greaterThan(0)
  })

  describe('each file is a valid schema', () => {
    for (const file of schema_files) {
      const relative_path = path.relative(schema_root, file)
      it(relative_path, () => {
        const ajv = new Ajv({ strict: false })
        addFormats(ajv)
        const schema = JSON.parse(fs.readFileSync(file, 'utf8'))
        const valid = ajv.validateSchema(schema)
        expect(
          valid,
          `${relative_path} is not a valid schema: ${ajv.errorsText(ajv.errors)}`
        ).to.equal(true)
      })
    }
  })

  describe('the set compiles together', () => {
    let ajv

    before(() => {
      ajv = new Ajv({ strict: false, validateSchema: false })
      addFormats(ajv)
      for (const file of schema_files) {
        const schema = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (schema.$id && !ajv.getSchema(schema.$id)) ajv.addSchema(schema)
      }
    })

    for (const file of schema_files) {
      const relative_path = path.relative(schema_root, file)
      it(relative_path, () => {
        const schema = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (!schema.$id) return
        expect(() => ajv.compile({ $ref: schema.$id })).to.not.throw()
      })
    }
  })
})
