import { describe, it } from 'mocha'
import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const repo_root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const src_root = path.join(repo_root, 'src')
const tokens_file = path.join(src_root, 'styles/tokens.styl')

// Below this a z-index orders siblings inside one component and never reaches
// the host page's stacking space, so it is none of the token contract's
// business. Above it, the value is a claim on the CONSUMER's layering, and this
// lib does not get to make that claim with a literal.
const LOCAL_STACKING_CEILING = 100

const list_styl_files = (dir) => {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full_path = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...list_styl_files(full_path))
    else if (entry.name.endsWith('.styl')) found.push(full_path)
  }
  return found
}

const read_declared_layer_tokens = () => {
  const source = fs.readFileSync(tokens_file, 'utf8')
  return new Set(source.match(/--rt-z-[a-z0-9-]+/g) || [])
}

describe('z-index token contract', () => {
  const styl_files = list_styl_files(src_root)

  it('finds stylesheets to check', () => {
    // Without this the two assertions below pass vacuously on an empty sweep,
    // which is the failure mode that makes a guard worse than no guard.
    expect(styl_files.length).to.be.greaterThan(10)
  })

  it('declares every layer token as an offset from --rt-z-base', () => {
    const source = fs.readFileSync(tokens_file, 'utf8')
    const declared = [...read_declared_layer_tokens()].filter(
      (token) => token !== '--rt-z-base'
    )

    expect(declared.length).to.be.greaterThan(0)

    for (const token of declared) {
      const declaration = source.match(
        new RegExp(`^\\s*${token}\\s+(.+)$`, 'm')
      )
      expect(declaration, `${token} is not declared`).to.not.equal(null)
      // Offsets are what make a single --rt-z-base override relocate the whole
      // lib. A token pinned to an absolute number silently opts out of that.
      expect(
        declaration[1],
        `${token} must be a calc() offset from --rt-z-base so consumers can ` +
          'relocate the whole lib with one declaration'
      ).to.match(/^calc\(var\(--rt-z-base\)\s*[+-]\s*\d+\)$/)
    }
  })

  it('sets no global-space z-index as a literal outside the token file', () => {
    const offenders = []

    for (const full_path of styl_files) {
      if (full_path === tokens_file) continue
      const lines = fs.readFileSync(full_path, 'utf8').split('\n')
      lines.forEach((line, index) => {
        const without_comment = line.replace(/\/\/.*$/, '')
        const match = without_comment.match(/z-index\s+(-?\d+)\s*$/)
        if (!match) return
        if (Number(match[1]) < LOCAL_STACKING_CEILING) return
        offenders.push(
          `${path.relative(repo_root, full_path)}:${index + 1} — ${match[1]}`
        )
      })
    }

    expect(
      offenders,
      'a floating surface must take its z-index from a --rt-z-* token, not a ' +
        "literal — a literal is this lib squatting on the consumer's stacking " +
        `space:\n  ${offenders.join('\n  ')}\n`
    ).to.deep.equal([])
  })

  it('uses only layer tokens that the token file declares', () => {
    const declared = read_declared_layer_tokens()
    const unknown = []

    for (const full_path of styl_files) {
      const lines = fs.readFileSync(full_path, 'utf8').split('\n')
      lines.forEach((line, index) => {
        const match = line.match(/z-index\s+var\((--rt-z-[a-z0-9-]+)\)/)
        if (!match || declared.has(match[1])) return
        unknown.push(
          `${path.relative(repo_root, full_path)}:${index + 1} — ${match[1]}`
        )
      })
    }

    expect(
      unknown,
      `undeclared layer token(s):\n  ${unknown.join('\n  ')}\n`
    ).to.deep.equal([])
  })
})
