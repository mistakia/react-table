import { describe, expect, test } from 'bun:test'
import {
  is_valid_table_state_structure,
  create_safe_table_state,
  validate_table_state
} from '../src/validators/index.mjs'

describe('is_valid_table_state_structure with scatter_plot_options', () => {
  test('accepts undefined scatter_plot_options', () => {
    expect(is_valid_table_state_structure({})).toBe(true)
  })

  test('accepts valid scatter_plot_options object', () => {
    expect(
      is_valid_table_state_structure({
        scatter_plot_options: { show_tier_grid: true }
      })
    ).toBe(true)
  })

  test('rejects scatter_plot_options as a string', () => {
    expect(
      is_valid_table_state_structure({ scatter_plot_options: 'bad' })
    ).toBe(false)
  })

  test('rejects scatter_plot_options as null', () => {
    expect(is_valid_table_state_structure({ scatter_plot_options: null })).toBe(
      false
    )
  })

  test('rejects scatter_plot_options as an array', () => {
    expect(is_valid_table_state_structure({ scatter_plot_options: [] })).toBe(
      false
    )
  })
})

describe('create_safe_table_state with scatter_plot_options', () => {
  test('passes through a valid scatter_plot_options object', () => {
    const opts = { show_tier_grid: false, show_x_mean_line: true }
    const result = create_safe_table_state({ scatter_plot_options: opts })
    expect(result.scatter_plot_options).toEqual(opts)
  })

  test('removes scatter_plot_options when it is not an object', () => {
    const result = create_safe_table_state({ scatter_plot_options: 'invalid' })
    expect(result.scatter_plot_options).toBeUndefined()
  })

  test('removes scatter_plot_options when it is null', () => {
    const result = create_safe_table_state({ scatter_plot_options: null })
    expect(result.scatter_plot_options).toBeUndefined()
  })

  test('removes scatter_plot_options when it is an array', () => {
    const result = create_safe_table_state({ scatter_plot_options: [] })
    expect(result.scatter_plot_options).toBeUndefined()
  })

  test('returns standard defaults when scatter_plot_options is absent', () => {
    const result = create_safe_table_state()
    expect(result.sort).toEqual([])
    expect(result.columns).toEqual([])
    expect(result.disable_scatter_plot).toBe(false)
    expect(result.scatter_plot_options).toBeUndefined()
  })
})

describe('validate_table_state with scatter_plot_options schema', () => {
  test('valid scatter_plot_options passes schema validation', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        show_tier_grid: false,
        show_x_mean_line: true,
        show_y_mean_line: true,
        point_color_mode: 'team',
        reference_lines: [
          { axis: 'x', value: 42, label: 'benchmark', color: '#ff0000' }
        ],
        custom_title: 'My chart',
        custom_subtitle: null,
        font_family: null
      }
    })
    expect(result.valid).toBe(true)
  })

  test('invalid axis enum is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        reference_lines: [{ axis: 'z', value: 10 }]
      }
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /axis|enum/i.test(e))).toBe(true)
  })

  test('non-numeric reference line value is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        reference_lines: [{ axis: 'x', value: 'not-a-number' }]
      }
    })
    expect(result.valid).toBe(false)
  })

  test('non-hex color string is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        reference_lines: [{ axis: 'y', value: 5, color: 'red' }]
      }
    })
    expect(result.valid).toBe(false)
  })

  test('valid 3-digit hex color is accepted', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        reference_lines: [{ axis: 'y', value: 5, color: '#abc' }]
      }
    })
    expect(result.valid).toBe(true)
  })

  test('custom_title exceeding maxLength is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        custom_title: 'a'.repeat(201)
      }
    })
    expect(result.valid).toBe(false)
  })

  test('custom_subtitle exceeding maxLength is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        custom_subtitle: 'b'.repeat(1001)
      }
    })
    expect(result.valid).toBe(false)
  })

  test('font_family exceeding maxLength is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        font_family: 'c'.repeat(101)
      }
    })
    expect(result.valid).toBe(false)
  })

  test('custom_title of null is accepted', () => {
    const result = validate_table_state({
      scatter_plot_options: { custom_title: null }
    })
    expect(result.valid).toBe(true)
  })

  test('reference_line label exceeding maxLength is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        reference_lines: [{ axis: 'x', value: 1, label: 'd'.repeat(201) }]
      }
    })
    expect(result.valid).toBe(false)
  })

  test('additionalProperties in scatter_plot_options is rejected', () => {
    const result = validate_table_state({
      scatter_plot_options: {
        unknown_field: true
      }
    })
    expect(result.valid).toBe(false)
  })

  test('empty scatter_plot_options object passes', () => {
    const result = validate_table_state({ scatter_plot_options: {} })
    expect(result.valid).toBe(true)
  })
})
