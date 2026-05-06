import { createRequire } from 'module'

const require = createRequire(import.meta.url)

require('@babel/register')({
  extensions: ['.js', '.jsx'],
  babelrc: false,
  configFile: false,
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react'
  ]
})

const pirates = require('pirates')
pirates.addHook(() => 'module.exports = {}', {
  exts: ['.styl', '.css'],
  matcher: () => true
})

const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
GlobalRegistrator.register()
globalThis.IS_REACT_ACT_ENVIRONMENT = true
