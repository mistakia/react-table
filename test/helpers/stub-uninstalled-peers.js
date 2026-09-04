// Test-only resolver shim for PEER dependencies this repo does not install.
//
// @mui/x-date-pickers and highcharts are peers, and nothing in node_modules
// satisfies them here. That made the Table itself unmountable in a spec: it
// pulls the parameters editor (which reaches the date pickers) and the scatter
// plot overlay (which reaches highcharts), so a mount died on MODULE_NOT_FOUND
// naming one of those rather than anything about the component under test.
//
// A stub is faithful for a spec that never reaches either surface -- a real
// picker needs a DATE column param opened in the parameters editor, and the
// chart needs two scatter axes chosen and the overlay opened. A spec that DOES
// exercise one of them must not use this shim: it would assert against an empty
// div and pass for the wrong reason.
//
// Import this module FIRST in such a spec, before any component import.
const Module = require('module')
const path = require('path')

const STUBBED_PEER_PREFIXES = [
  '@mui/x-date-pickers',
  'highcharts',
  'highcharts-react-official'
]

const stub_path = path.resolve(__dirname, 'uninstalled-peer-stub.js')
const original_resolve = Module._resolveFilename

Module._resolveFilename = function (request, ...rest) {
  const is_stubbed = STUBBED_PEER_PREFIXES.some(
    (prefix) => request === prefix || request.startsWith(`${prefix}/`)
  )
  if (is_stubbed) {
    return stub_path
  }
  return original_resolve.call(this, request, ...rest)
}
