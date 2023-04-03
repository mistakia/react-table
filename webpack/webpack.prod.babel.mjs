// Important modules this config uses
import path from 'path'

import base from './webpack.base.babel.mjs'

export default base({
  mode: 'production',

  // In production, we skip all hot-reloading stuff
  entry: [path.join(process.cwd(), 'index.js')],

  output: {
    path: path.resolve('dist'),
    filename: 'react-table.js',
    libraryTarget: 'module'
  },

  plugins: [],

  externals: [
    /@mui.*/,
    {
      '@emotion/react': '@emotion/react',
      '@emotion/styled': '@emotion/styled',
      react: 'react',
      'react-dom': 'react-dom',
      immutable: 'immutable',
      'prop-types': 'prop-types',
      'react-immutable-proptypes': 'react-immutable-proptypes'
    }
  ],

  performance: {
    assetFilter: (assetFilename) =>
      !/(\.map$)|(^(main\.|favicon\.))/.test(assetFilename)
  }
})
