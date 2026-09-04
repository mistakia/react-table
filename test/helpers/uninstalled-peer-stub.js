// The single module every stubbed peer resolves to (see stub-uninstalled-peers.js).
//
// Exported as a FUNCTION carrying properties, because the peers are consumed
// three ways and one object has to answer all of them: a default import used as
// a component (HighchartsReact), a default import used as a namespace object
// (Highcharts), and named imports (the pickers). Babel's CJS interop hands the
// whole module.exports to each.
//
// These are placeholders that render nothing, not components: display names and
// prop types would document a contract the stub deliberately does not have.
/* eslint-disable react/display-name, react/prop-types */
const React = require('react')

const stub = () => React.createElement('div')

stub.LocalizationProvider = ({ children }) => children || null
stub.DatePicker = () => React.createElement('div')
stub.AdapterDayjs = class {}

module.exports = stub
