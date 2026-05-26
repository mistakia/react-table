import globals from 'globals'
import babelParser from '@babel/eslint-parser'
import neostandard from 'neostandard'
import react from 'eslint-plugin-react'

export default [
  {
    ignores: ['dist/**/*', '.yarn/**/*']
  },
  ...neostandard({
    noJsx: true
  }),
  {
    ...react.configs.flat.recommended,
    files: ['**/*.{js,mjs,jsx}']
  },
  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parser: babelParser,
      ecmaVersion: 12,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        requireConfigFile: false
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      camelcase: 'off',
      curly: 'off',
      '@stylistic/indent': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/generator-star-spacing': [
        'error',
        { before: false, after: true }
      ],
      '@stylistic/space-before-function-paren': [
        'error',
        { anonymous: 'always', named: 'never', asyncArrow: 'always' }
      ]
    }
  },
  {
    files: ['test/**/*.{mjs,jsx}'],
    rules: {
      'no-unused-expressions': 'off'
    }
  }
]
