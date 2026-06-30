// Test-only resolver shim for `#src/*` subpath imports.
//
// Components are transpiled by @babel/register (CJS require), but the project's
// `#src/*` -> `./src/*` map is an `imports` field resolved with ESM semantics:
// no directory `index` resolution and no extension inference. So a bare
// `#src/utils` (a directory) or `#src/table-context` (no extension) cannot be
// required, even though webpack resolves them at build time. Patch the CJS
// filename resolver to map `#src/*` to a real file under ./src with the usual
// index/extension fallback, so component specs can mount the real components.
//
// Import this module FIRST (before any component import) in a spec that mounts a
// component using bare `#src/*` specifiers.
const Module = require('module')
const path = require('path')
const fs = require('fs')

const src_root = path.resolve(__dirname, '../../src')
const original_resolve = Module._resolveFilename

const resolution_candidates = (base) => [
  base,
  `${base}.js`,
  `${base}.mjs`,
  `${base}.jsx`,
  path.join(base, 'index.js'),
  path.join(base, 'index.mjs')
]

Module._resolveFilename = function (request, ...rest) {
  if (request === '#src' || request.startsWith('#src/')) {
    const relative = request === '#src' ? '' : request.slice('#src/'.length)
    const base = path.join(src_root, relative)
    for (const candidate of resolution_candidates(base)) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    }
  }
  return original_resolve.call(this, request, ...rest)
}
