import { describe, expect, test } from 'bun:test'
import {
  handle_array_param_value,
  handle_dynamic_param_value,
  handle_range_param_value,
  handle_single_param_value,
  format_column_params
} from '#src/utils/format-column-params.js'

// TABLE_DATA_TYPES constants (mirrored to avoid importing .mjs with conditions)
const TABLE_DATA_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  JSON: 3,
  BOOLEAN: 4,
  DATE: 5,
  BINARY_UUID: 6,
  SELECT: 7,
  RANGE: 8
}

describe('handle_single_param_value', () => {
  test('boolean param — true renders YES', () => {
    const column = {
      column_params: {
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = handle_single_param_value(
      true,
      'rush_only',
      column,
      'Rush Only'
    )
    expect(result).toBe('Rush Only: YES')
  })

  test('boolean param — false renders NO', () => {
    const column = {
      column_params: {
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = handle_single_param_value(
      false,
      'rush_only',
      column,
      'Rush Only'
    )
    expect(result).toBe('Rush Only: NO')
  })

  test('select param with matching values entry uses label', () => {
    const column = {
      column_params: {
        position: {
          label: 'Position',
          values: [
            { value: 'QB', label: 'Quarterback' },
            { value: 'RB', label: 'Running Back' }
          ]
        }
      }
    }
    const result = handle_single_param_value(
      'QB',
      'position',
      column,
      'Position'
    )
    expect(result).toBe('Position: Quarterback')
  })

  test('select param with no matching values entry falls back to raw value', () => {
    const column = {
      column_params: {
        position: {
          label: 'Position',
          values: [{ value: 'QB', label: 'Quarterback' }]
        }
      }
    }
    const result = handle_single_param_value(
      'WR',
      'position',
      column,
      'Position'
    )
    expect(result).toBe('Position: WR')
  })
})

describe('handle_array_param_value', () => {
  test('array of scalar values resolves labels from values definition', () => {
    const column = {
      column_params: {
        positions: {
          label: 'Positions',
          values: [
            { value: 'QB', label: 'Quarterback' },
            { value: 'RB', label: 'Running Back' }
          ]
        }
      }
    }
    const result = handle_array_param_value(
      ['QB', 'RB'],
      'positions',
      column,
      'Positions'
    )
    expect(result).toBe('Quarterback, Running Back')
  })

  test('array of object items with label property', () => {
    const column = { column_params: { items: { label: 'Items' } } }
    const result = handle_array_param_value(
      [
        { label: 'Alpha', value: 1 },
        { label: 'Beta', value: 2 }
      ],
      'items',
      column,
      'Items'
    )
    expect(result).toBe('Alpha, Beta')
  })

  test('uses format_param_values override when defined', () => {
    const column = {
      column_params: {
        custom: {
          label: 'Custom',
          format_param_values: (val) => val.join(' + ')
        }
      }
    }
    const result = handle_array_param_value(
      ['a', 'b', 'c'],
      'custom',
      column,
      'Custom'
    )
    expect(result).toBe('a + b + c')
  })

  test('array with dynamic_type items renders dynamic_type string', () => {
    const column = { column_params: { dyn: { label: 'Dyn' } } }
    const result = handle_array_param_value(
      [{ dynamic_type: 'rolling', value: '5' }],
      'dyn',
      column,
      'Dyn'
    )
    expect(result).toBe('rolling (5)')
  })
})

describe('handle_range_param_value', () => {
  test('range with high_value equal to max renders low_value+', () => {
    const column = {
      column_params: { age: { label: 'Age', min: 0, max: 40 } }
    }
    const result = handle_range_param_value([10, 40], 'age', column, 'Age')
    expect(result).toBe('Age: 10+')
  })

  test('range with low_value equal to min renders <high_value', () => {
    const column = {
      column_params: { age: { label: 'Age', min: 0, max: 40 } }
    }
    const result = handle_range_param_value([0, 25], 'age', column, 'Age')
    expect(result).toBe('Age: <25')
  })

  test('range in the middle renders low-high', () => {
    const column = {
      column_params: { age: { label: 'Age', min: 0, max: 40 } }
    }
    const result = handle_range_param_value([10, 30], 'age', column, 'Age')
    expect(result).toBe('Age: 10-30')
  })

  test('values are sorted so min is always left', () => {
    const column = {
      column_params: { age: { label: 'Age', min: 0, max: 40 } }
    }
    const result = handle_range_param_value([30, 10], 'age', column, 'Age')
    expect(result).toBe('Age: 10-30')
  })
})

describe('handle_dynamic_param_value', () => {
  test('resolves label from dynamic_values definition', () => {
    const column = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'rolling', label: 'Rolling Avg' }]
        }
      }
    }
    const result = handle_dynamic_param_value(
      { dynamic_type: 'rolling', value: '4' },
      'week',
      column,
      'Week'
    )
    expect(result).toBe('Week: Rolling Avg (4)')
  })

  test('falls back to dynamic_type when no dynamic_values match', () => {
    const column = {
      column_params: { week: { label: 'Week', dynamic_values: [] } }
    }
    const result = handle_dynamic_param_value(
      { dynamic_type: 'absolute', value: '' },
      'week',
      column,
      'Week'
    )
    expect(result).toBe('Week: absolute')
  })

  test('omits value suffix when value is falsy', () => {
    const column = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'current', label: 'Current' }]
        }
      }
    }
    const result = handle_dynamic_param_value(
      { dynamic_type: 'current' },
      'week',
      column,
      'Week'
    )
    expect(result).toBe('Week: Current')
  })
})

describe('format_column_params', () => {
  test('returns empty parts and blank strings when column_params is falsy', () => {
    const result = format_column_params({ column: {}, column_params: null })
    expect(result.parts).toEqual([])
    expect(result.short).toBe('')
    expect(result.long).toBe('')
    expect(result.multiline).toBe('')
  })

  test('returns empty parts and blank strings when column_params is undefined', () => {
    const result = format_column_params({})
    expect(result.parts).toEqual([])
    expect(result.short).toBe('')
  })

  test('skips falsy param values', () => {
    const result = format_column_params({
      column: {},
      column_params: { empty: null, also_empty: undefined }
    })
    expect(result.parts).toEqual([])
  })

  test('boolean param produces correct part and short string', () => {
    const column = {
      column_params: {
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column,
      column_params: { rush_only: true }
    })
    expect(result.parts).toHaveLength(1)
    expect(result.parts[0]).toMatchObject({
      key: 'rush_only',
      label: 'Rush Only',
      value: true,
      value_label: 'Rush Only: YES'
    })
    expect(result.short).toBe('Rush Only: YES')
  })

  test('select param with explicit value label', () => {
    const column = {
      column_params: {
        position: {
          label: 'Position',
          values: [{ value: 'QB', label: 'Quarterback' }]
        }
      }
    }
    const result = format_column_params({
      column,
      column_params: { position: 'QB' }
    })
    expect(result.parts[0].value_label).toBe('Position: Quarterback')
    expect(result.short).toBe('Position: Quarterback')
  })

  test('range param with min/max boundaries', () => {
    const column = {
      column_params: {
        age: {
          label: 'Age',
          min: 0,
          max: 40,
          data_type: TABLE_DATA_TYPES.RANGE
        }
      }
    }
    const result = format_column_params({
      column,
      column_params: { age: [5, 40] }
    })
    expect(result.parts[0].value_label).toBe('Age: 5+')
    expect(result.short).toBe('Age: 5+')
  })

  test('dynamic param produces correct part', () => {
    const column = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'rolling', label: 'Rolling' }]
        }
      }
    }
    const result = format_column_params({
      column,
      column_params: { week: { dynamic_type: 'rolling', value: '4' } }
    })
    expect(result.parts[0].value_label).toBe('Week: Rolling (4)')
  })

  test('multiple params produce multiple parts and correct joined strings', () => {
    const column = {
      column_params: {
        position: {
          label: 'Position',
          values: [{ value: 'QB', label: 'Quarterback' }]
        },
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column,
      column_params: { position: 'QB', rush_only: true }
    })
    expect(result.parts).toHaveLength(2)
    expect(result.short).toBe('Position: Quarterback, Rush Only: YES')
    expect(result.long).toBe('Position: Quarterback | Rush Only: YES')
    expect(result.multiline).toBe('Position: Quarterback\nRush Only: YES')
  })

  test('numeric param with value 0 produces a part (falsy guard preserves zero)', () => {
    const column = {
      column_params: {
        min_snaps: { label: 'Min Snaps' }
      }
    }
    const result = format_column_params({
      column,
      column_params: { min_snaps: 0 }
    })
    expect(result.parts).toHaveLength(1)
    expect(result.parts[0].value).toBe(0)
    expect(result.short).toBe('Min Snaps: 0')
  })
})

describe('axis title derivation from format_column_params (S10)', () => {
  test('axis title uses formatted params short string when params are present', () => {
    const column = {
      column_params: {
        year: { label: 'Year' }
      },
      header_label: 'Passing Yards'
    }
    const column_params = { year: 2022 }
    const result = format_column_params({ column, column_params })
    // Axis title should be the formatted string, not the raw header_label
    expect(result.short).toBe('Year: 2022')
    // Fallback would be header_label
    const axis_title = result.short || column.header_label || 'X Axis'
    expect(axis_title).toBe('Year: 2022')
  })

  test('axis title falls back to header_label when no params', () => {
    const column = {
      column_params: {},
      header_label: 'Passing Yards'
    }
    const result = format_column_params({ column, column_params: {} })
    expect(result.short).toBe('')
    const axis_title = result.short || column.header_label || 'X Axis'
    expect(axis_title).toBe('Passing Yards')
  })

  test('axis title falls back to name when header_label absent', () => {
    const column = { name: 'pass_yds' }
    const result = format_column_params({ column, column_params: null })
    expect(result.short).toBe('')
    const axis_title =
      result.short || column.header_label || column.name || 'X Axis'
    expect(axis_title).toBe('pass_yds')
  })

  test('axis title falls back to sentinel when column has no label fields', () => {
    const column = {}
    const result = format_column_params({ column, column_params: null })
    const axis_title =
      result.short || column.header_label || column.name || 'X Axis'
    expect(axis_title).toBe('X Axis')
  })
})
