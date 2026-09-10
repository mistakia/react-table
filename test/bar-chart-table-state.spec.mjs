import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, it } from 'mocha'
import { expect } from 'chai'

import { SCHEMAS } from '../src/validators/schema-resolver.mjs'
import {
  validate_table_state,
  is_valid_table_state_structure,
  create_safe_table_state
} from '../src/validators/index.mjs'
import { SHARE_LINK_URL_SCHEMA } from '../src/constants.mjs'
import { parse_url_params_to_table_state } from '../src/utils/parse-url-params-to-table-state.mjs'

const test_dir = path.dirname(fileURLToPath(import.meta.url))
const published_table_state = JSON.parse(
  fs.readFileSync(
    path.join(test_dir, '../schema/state/table-state.json'),
    'utf8'
  )
)
const published_bar_chart_options = JSON.parse(
  fs.readFileSync(
    path.join(test_dir, '../schema/state/bar-chart-options.json'),
    'utf8'
  )
)

describe('bar chart table state', () => {
  describe('schema', () => {
    it('declares bar_chart_options in both copies', () => {
      expect(published_table_state.properties).to.have.property(
        'bar_chart_options'
      )
      expect(SCHEMAS['table-state'].properties).to.have.property(
        'bar_chart_options'
      )
    })

    it('declares disable_bar_chart in both copies', () => {
      expect(published_table_state.properties).to.have.property(
        'disable_bar_chart'
      )
      expect(SCHEMAS['table-state'].properties).to.have.property(
        'disable_bar_chart'
      )
    })

    it('gives the published and bundled bar-chart-options the same $id', () => {
      expect(published_bar_chart_options.$id).to.equal(
        SCHEMAS['bar-chart-options'].$id
      )
    })

    it('gives them the same property set', () => {
      expect(
        Object.keys(published_bar_chart_options.properties).sort()
      ).to.deep.equal(
        Object.keys(SCHEMAS['bar-chart-options'].properties).sort()
      )
    })

    it('closes bar-chart-options to unknown keys in both copies', () => {
      expect(published_bar_chart_options.additionalProperties).to.equal(false)
      expect(SCHEMAS['bar-chart-options'].additionalProperties).to.equal(false)
    })
  })

  describe('validation', () => {
    it('accepts a full bar_chart_options object', () => {
      const result = validate_table_state({
        bar_chart_options: {
          orientation: 'horizontal',
          show_average_line: false,
          show_value_labels: true,
          average_line_label: 'League avg',
          value_decimals: 3,
          custom_title: 'EPA/P',
          custom_subtitle: null,
          custom_x_axis_title: 'Team',
          custom_y_axis_title: 'EPA/P',
          font_family: 'IBM Plex Mono'
        }
      })
      expect(result.errors).to.deep.equal([])
      expect(result.valid).to.equal(true)
    })

    it('rejects an unknown orientation', () => {
      const result = validate_table_state({
        bar_chart_options: { orientation: 'diagonal' }
      })
      expect(result.valid).to.equal(false)
      expect(result.errors.join(' ')).to.include('orientation')
    })

    it('rejects an unknown bar_chart_options key', () => {
      const result = validate_table_state({
        bar_chart_options: { show_tier_grid: true }
      })
      expect(result.valid).to.equal(false)
    })

    it('rejects a non-integer value_decimals', () => {
      expect(
        validate_table_state({ bar_chart_options: { value_decimals: 1.5 } })
          .valid
      ).to.equal(false)
    })

    it('accepts disable_bar_chart as a boolean', () => {
      expect(validate_table_state({ disable_bar_chart: true }).valid).to.equal(
        true
      )
    })
  })

  describe('structure guard', () => {
    it('rejects a non-boolean disable_bar_chart', () => {
      expect(
        is_valid_table_state_structure({ disable_bar_chart: 'yes' })
      ).to.equal(false)
    })

    it('rejects an array bar_chart_options', () => {
      expect(
        is_valid_table_state_structure({ bar_chart_options: [] })
      ).to.equal(false)
    })

    it('rejects a null bar_chart_options', () => {
      expect(
        is_valid_table_state_structure({ bar_chart_options: null })
      ).to.equal(false)
    })

    it('still rejects a bad scatter_plot_options after the shared refactor', () => {
      expect(
        is_valid_table_state_structure({ scatter_plot_options: [] })
      ).to.equal(false)
    })

    it('accepts a well-formed pair', () => {
      expect(
        is_valid_table_state_structure({
          disable_bar_chart: false,
          bar_chart_options: { orientation: 'vertical' }
        })
      ).to.equal(true)
    })
  })

  describe('create_safe_table_state', () => {
    it('defaults disable_bar_chart to false', () => {
      expect(create_safe_table_state().disable_bar_chart).to.equal(false)
    })

    it('strips a malformed bar_chart_options', () => {
      const safe = create_safe_table_state({ bar_chart_options: 'nope' })
      expect(safe).to.not.have.property('bar_chart_options')
    })

    it('keeps a well-formed one', () => {
      const safe = create_safe_table_state({
        bar_chart_options: { orientation: 'horizontal' }
      })
      expect(safe.bar_chart_options).to.deep.equal({
        orientation: 'horizontal'
      })
    })
  })

  describe('share link', () => {
    it('declares both keys with their serialization types', () => {
      expect(SHARE_LINK_URL_SCHEMA.table_state.bar_chart_options).to.equal(
        'object'
      )
      expect(SHARE_LINK_URL_SCHEMA.table_state.disable_bar_chart).to.equal(
        'boolean'
      )
    })

    it('round-trips bar_chart_options through URL params', () => {
      const options = { orientation: 'horizontal', show_average_line: false }
      const params = new URLSearchParams()
      params.append('bar_chart_options', JSON.stringify(options))
      params.append('disable_bar_chart', 'false')

      const parsed = parse_url_params_to_table_state(params)
      expect(parsed.table_state.bar_chart_options).to.deep.equal(options)
      expect(parsed.table_state.disable_bar_chart).to.equal(false)
    })

    it('gives bar_chart_options an empty-object default when absent', () => {
      const parsed = parse_url_params_to_table_state(new URLSearchParams())
      expect(parsed.table_state.bar_chart_options).to.deep.equal({})
    })
  })
})
