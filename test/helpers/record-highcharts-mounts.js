// Test-only resolver shim that replaces the highcharts peers with a RECORDER.
//
// Distinct from stub-uninstalled-peers.js on purpose. That one renders nothing
// and is for specs that never reach a chart; this one is for the one question a
// silent stub cannot answer -- whether React kept the chart element across an
// options change or threw it away and mounted a new one. Nothing about the
// rendered chart is asserted, so the absent peer costs nothing here.
//
// Import this module FIRST in such a spec, before any component import.
const Module = require('module')
const path = require('path')

const PREFIXES = ['highcharts', 'highcharts-react-official']
const stub_path = path.resolve(__dirname, 'highcharts-mount-recorder.js')
const original_resolve = Module._resolveFilename

Module._resolveFilename = function (request, ...rest) {
  const is_stubbed = PREFIXES.some(
    (prefix) => request === prefix || request.startsWith(`${prefix}/`)
  )
  if (is_stubbed) return stub_path
  return original_resolve.call(this, request, ...rest)
}

module.exports = require(stub_path)
