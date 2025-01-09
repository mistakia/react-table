import globals from 'globals'
import babelParser from '@babel/eslint-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [
  {
    ignores: ['dist/**/*', '.yarn/**/*']
  },
  ...compat
    .extends('standard', 'eslint:recommended', 'plugin:react/recommended')
    .map((config) => ({
      ...config,
      files: ['**/*.js', '**/*.mjs']
    })),
  {
    files: ['**/*.js', '**/*.mjs'],

    languageOptions: {
      globals: {
        ...globals.browser
      },

      parser: babelParser,
      ecmaVersion: 12,
      sourceType: 'script',

      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },

        sourceType: 'module',

        requireConfigFile: false
      }
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    rules: {
      camelcase: ['off'],
      curly: ['off'],
      indent: ['off'],
      'multiline-ternary': ['off', 'always'],

      'generator-star-spacing': [
        'error',
        {
          before: false,
          after: true
        }
      ],

      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ]
    }
  }
]
