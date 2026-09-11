// The module both highcharts peers resolve to under record-highcharts-mounts.js.
//
// Exported as a FUNCTION carrying properties for the same reason as
// uninstalled-peer-stub.js: the peers are consumed both as a component
// (HighchartsReact) and as a namespace object (Highcharts), and Babel's CJS
// interop hands the whole module.exports to each.
/* eslint-disable react/prop-types */
const React = require('react')

const mounts = []
let next_id = 1

// A mount records its own identity and the options it was handed; an unmount
// records that it went away. A remount is therefore two entries, which is what
// distinguishes it from an in-place options update -- that produces one entry
// with a changed `options` and no unmount.
const Recorder = ({ options }) => {
  const id = React.useRef(null)
  if (id.current === null) id.current = next_id++
  React.useEffect(() => {
    mounts.push({ event: 'mount', id: id.current, options })
    return () => mounts.push({ event: 'unmount', id: id.current })
  }, [])
  return React.createElement('div', { className: 'chart-recorder' })
}

const stub = (props) => React.createElement(Recorder, props)
stub.mounts = mounts
stub.reset = () => {
  mounts.length = 0
}

module.exports = stub
