import { describe, it } from 'mocha'
import { expect } from 'chai'

import { format_column_params } from '#src/utils/format-column-params.js'

// Inline TABLE_DATA_TYPES to avoid coupling the spec to constants resolution.
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

describe('format_column_params - short variant', () => {
  it('returns "" when column_state_params is null', () => {
    expect(format_column_params({ column_state_params: null })).to.equal('')
  })

  it('returns default_label when column_state_params is null', () => {
    expect(
      format_column_params({
        column_state_params: null,
        default_label: 'ALL'
      })
    ).to.equal('ALL')
  })

  it('skips null and undefined values', () => {
    const result = format_column_params({
      column_def: {},
      column_state_params: { a: null, b: undefined }
    })
    expect(result).to.equal('')
  })

  it('skips empty arrays', () => {
    const result = format_column_params({
      column_def: { column_params: { items: { label: 'Items' } } },
      column_state_params: { items: [] }
    })
    expect(result).to.equal('')
  })

  it('renders boolean true as YES', () => {
    const column_def = {
      column_params: {
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { rush_only: true }
    })
    expect(result).to.equal('YES')
  })

  it('renders boolean false as NO (bug #1: bare false passes skip gate)', () => {
    const column_def = {
      column_params: {
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { rush_only: false }
    })
    expect(result).to.equal('NO')
  })

  it('renders numeric 0 (bug #1: bare 0 passes skip gate)', () => {
    const column_def = {
      column_params: { year_offset: { label: 'Year + N' } }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { year_offset: 0 }
    })
    expect(result).to.equal('0')
  })

  it('renders select primitive with matching values def label', () => {
    const column_def = {
      column_params: {
        position: {
          label: 'Position',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [
            { value: 'QB', label: 'Quarterback' },
            { value: 'RB', label: 'Running Back' }
          ]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { position: 'QB' }
    })
    expect(result).to.equal('Quarterback')
  })

  it('renders select primitive falling back to raw value on no match', () => {
    const column_def = {
      column_params: {
        position: {
          label: 'Position',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [{ value: 'QB', label: 'Quarterback' }]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { position: 'WR' }
    })
    expect(result).to.equal('WR')
  })

  it('renders array of select primitives joined by ", "', () => {
    const column_def = {
      column_params: {
        positions: {
          label: 'Positions',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [
            { value: 'QB', label: 'Quarterback' },
            { value: 'RB', label: 'Running Back' }
          ]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { positions: ['QB', 'RB'] }
    })
    expect(result).to.equal('Quarterback, Running Back')
  })

  it('renders {value, label} object element using label', () => {
    const column_def = {
      column_params: { items: { label: 'Items' } }
    }
    const result = format_column_params({
      column_def,
      column_state_params: {
        items: [
          { label: 'Alpha', value: 1 },
          { label: 'Beta', value: 2 }
        ]
      }
    })
    expect(result).to.equal('Alpha, Beta')
  })

  it('renders dynamic_type with value', () => {
    const column_def = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'rolling', label: 'Rolling Avg' }]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { week: { dynamic_type: 'rolling', value: '4' } }
    })
    expect(result).to.equal('Rolling Avg (4)')
  })

  it('renders dynamic_type without value', () => {
    const column_def = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'current', label: 'Current' }]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { week: { dynamic_type: 'current' } }
    })
    expect(result).to.equal('Current')
  })

  it('renders dynamic_type with value 0 (bug #3: != null preserves zero)', () => {
    const column_def = {
      column_params: {
        week: {
          label: 'Week',
          dynamic_values: [{ dynamic_type: 'last_n', label: 'Last N' }]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { week: { dynamic_type: 'last_n', value: 0 } }
    })
    expect(result).to.equal('Last N (0)')
  })

  it('renders dynamic_type unknown falls back to dynamic_type string', () => {
    const column_def = {
      column_params: { week: { label: 'Week', dynamic_values: [] } }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { week: { dynamic_type: 'absolute' } }
    })
    expect(result).to.equal('absolute')
  })

  it('renders mixed static + dynamic array', () => {
    const column_def = {
      column_params: {
        nfl_week_id: {
          label: 'NFL Week',
          values: [
            { value: '2024-REG-1', label: '2024 REG: 1' },
            { value: '2024-REG-2', label: '2024 REG: 2' }
          ],
          dynamic_values: [
            { dynamic_type: 'current_nfl_week', label: 'Current NFL Week' }
          ]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: {
        nfl_week_id: ['2024-REG-1', { dynamic_type: 'current_nfl_week' }]
      }
    })
    expect(result).to.equal('2024 REG: 1, Current NFL Week')
  })

  it('renders explicit null element using {value: null, label} def', () => {
    const column_def = {
      column_params: {
        team: {
          label: 'Team',
          values: [
            { value: null, label: 'No Team' },
            { value: 'KC', label: 'Kansas City' }
          ]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { team: [null, 'KC'] }
    })
    expect(result).to.equal('No Team, Kansas City')
  })

  it('renders explicit null element with default "None" when no def matches', () => {
    const column_def = {
      column_params: { team: { label: 'Team', values: [] } }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { team: [null] }
    })
    expect(result).to.equal('None')
  })
})

describe('format_column_params - long variant', () => {
  it('renders "Key: Value" for a single param', () => {
    const column_def = {
      column_params: {
        position: {
          label: 'Position',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [{ value: 'QB', label: 'Quarterback' }]
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { position: 'QB' },
      variant: 'long'
    })
    expect(result).to.equal('Position: Quarterback')
  })

  it('joins multiple params with ", "', () => {
    const column_def = {
      column_params: {
        position: {
          label: 'Position',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [{ value: 'QB', label: 'Quarterback' }]
        },
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { position: 'QB', rush_only: true },
      variant: 'long'
    })
    expect(result).to.equal('Position: Quarterback, Rush Only: YES')
  })

  it('falls back to param_key when label is missing', () => {
    const result = format_column_params({
      column_def: { column_params: { foo: {} } },
      column_state_params: { foo: 'bar' },
      variant: 'long'
    })
    expect(result).to.equal('foo: bar')
  })
})

describe('format_column_params - short variant join separator', () => {
  it('joins multiple params with " · "', () => {
    const column_def = {
      column_params: {
        position: {
          label: 'Position',
          data_type: TABLE_DATA_TYPES.SELECT,
          values: [{ value: 'QB', label: 'Quarterback' }]
        },
        rush_only: { label: 'Rush Only', data_type: TABLE_DATA_TYPES.BOOLEAN }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { position: 'QB', rush_only: true },
      variant: 'short'
    })
    expect(result).to.equal('Quarterback · YES')
  })
})

describe('format_column_params - range', () => {
  const range_column = {
    column_params: {
      age: {
        label: 'Age',
        data_type: TABLE_DATA_TYPES.RANGE,
        min: 0,
        max: 40
      }
    }
  }

  it('renders full range as "All" and marks is_default (bug #5)', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [0, 40] },
      variant: 'short'
    })
    expect(result).to.equal('All')
  })

  it('full range is excluded under exclude_defaults', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [0, 40] },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('')
  })

  it('renders "lo+" when high equals max', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [10, 40] },
      variant: 'short'
    })
    expect(result).to.equal('10+')
  })

  it('renders "<hi" when low equals min', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [0, 25] },
      variant: 'short'
    })
    expect(result).to.equal('<25')
  })

  it('renders "lo-hi" in the middle (bug #6: hyphen separator)', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [10, 30] },
      variant: 'short'
    })
    expect(result).to.equal('10-30')
  })

  it('sorts low/high when reversed', () => {
    const result = format_column_params({
      column_def: range_column,
      column_state_params: { age: [30, 10] },
      variant: 'short'
    })
    expect(result).to.equal('10-30')
  })

  it('uses epsilon for float-step boundaries (bug #7)', () => {
    const column_def = {
      column_params: {
        rate: {
          label: 'Rate',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 1,
          step: 0.1
        }
      }
    }
    // 0.30000001 is within step/2 of 0.3 -- but here we test that lo near max within epsilon counts as "All"
    const result = format_column_params({
      column_def,
      column_state_params: { rate: [0.0000001, 0.9999999] },
      variant: 'short'
    })
    expect(result).to.equal('All')
  })

  it('renders single-value range scalar', () => {
    const column_def = {
      column_params: {
        offset: {
          label: 'Offset',
          data_type: TABLE_DATA_TYPES.RANGE,
          is_single: true,
          default_value: 0,
          min: -30,
          max: 30
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { offset: 5 },
      variant: 'short'
    })
    expect(result).to.equal('5')
  })

  it('marks single-value range default and excludes under exclude_defaults', () => {
    const column_def = {
      column_params: {
        offset: {
          label: 'Offset',
          data_type: TABLE_DATA_TYPES.RANGE,
          is_single: true,
          default_value: 0,
          min: -30,
          max: 30
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { offset: 0 },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('')
  })
})

describe('format_column_params - date', () => {
  it('formats date string', () => {
    const column_def = {
      column_params: {
        as_of: { label: 'As Of', data_type: TABLE_DATA_TYPES.DATE }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { as_of: '2024-08-15' },
      variant: 'short'
    })
    expect(result).to.equal('2024-08-15')
  })
})

describe('format_column_params - format_value override', () => {
  it('delegates value rendering to format_value when present', () => {
    const column_def = {
      column_params: {
        nfl_week_id: {
          label: 'NFL Week',
          format_value: ({ value }) => `custom:${value.length}`
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: {
        nfl_week_id: ['a', 'b', 'c']
      },
      variant: 'long'
    })
    expect(result).to.equal('NFL Week: custom:3')
  })

  it('passes def to format_value', () => {
    let received_def
    const column_def = {
      column_params: {
        custom: {
          label: 'C',
          extra: 'meta',
          format_value: ({ value, def }) => {
            received_def = def
            return String(value)
          }
        }
      }
    }
    format_column_params({
      column_def,
      column_state_params: { custom: 1 }
    })
    expect(received_def?.extra).to.equal('meta')
  })

  it('engine computes is_default for override values', () => {
    const column_def = {
      column_params: {
        flag: {
          label: 'Flag',
          default_value: 'on',
          format_value: ({ value }) => `flag(${value})`
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { flag: 'on' },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('')
  })

  it('treats single-element array of object default as default', () => {
    const column_def = {
      column_params: {
        nfl_week_id: {
          label: 'NFL Week',
          default_value: { dynamic_type: 'current_year_reg_weeks' },
          format_value: ({ value }) =>
            Array.isArray(value)
              ? value.map((v) => v.dynamic_type).join(',')
              : value.dynamic_type
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: {
        nfl_week_id: [{ dynamic_type: 'current_year_reg_weeks' }]
      },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('')
  })
})

describe('format_column_params - exclude_defaults', () => {
  it('excludes boolean default', () => {
    const column_def = {
      column_params: {
        rush_only: {
          label: 'Rush Only',
          data_type: TABLE_DATA_TYPES.BOOLEAN,
          default_value: false
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { rush_only: false },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('')
  })

  it('keeps non-default value', () => {
    const column_def = {
      column_params: {
        rush_only: {
          label: 'Rush Only',
          data_type: TABLE_DATA_TYPES.BOOLEAN,
          default_value: false
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { rush_only: true },
      variant: 'short',
      exclude_defaults: true
    })
    expect(result).to.equal('YES')
  })

  it('falls back to default_label when all params excluded', () => {
    const column_def = {
      column_params: {
        rush_only: {
          label: 'Rush Only',
          data_type: TABLE_DATA_TYPES.BOOLEAN,
          default_value: false
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { rush_only: false },
      variant: 'short',
      exclude_defaults: true,
      default_label: 'ALL'
    })
    expect(result).to.equal('ALL')
  })
})

describe('format_column_params - show_key_in_short', () => {
  it('omits key prefix in short variant when flag is unset (default)', () => {
    const column_def = {
      column_params: {
        wind: {
          label: 'Wind',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 100
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { wind: [10, 20] },
      variant: 'short'
    })
    expect(result).to.equal('10-20')
  })

  it('prefixes value with key_label in short variant when flag is true', () => {
    const column_def = {
      column_params: {
        year_offset: {
          label: 'Year + N',
          show_key_in_short: true
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { year_offset: 0 },
      variant: 'short'
    })
    expect(result).to.equal('Year + N: 0')
  })

  it('long variant always prefixes with label, ignoring show_key_in_short', () => {
    const column_def = {
      column_params: {
        wind: {
          label: 'Wind',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 100,
          show_key_in_short: false
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { wind: [10, 20] },
      variant: 'long'
    })
    expect(result).to.equal('Wind: 10-20')
  })

  it('only flagged params get a prefix when mixed in same render', () => {
    const column_def = {
      column_params: {
        year_offset: { label: 'Year + N', show_key_in_short: true },
        wind: {
          label: 'Wind',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 100
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { year_offset: 0, wind: [10, 20] },
      variant: 'short'
    })
    expect(result).to.equal('Year + N: 0 · 10-20')
  })

  it('uses short_label for prefix in short variant when present', () => {
    const column_def = {
      column_params: {
        ydl_100: {
          label: 'Yardline (yds to end zone)',
          short_label: 'Yds to EZ',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 99,
          show_key_in_short: true
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { ydl_100: [0, 19] },
      variant: 'short'
    })
    expect(result).to.equal('Yds to EZ: <19')
  })

  it('long variant uses descriptive label even when short_label is set', () => {
    const column_def = {
      column_params: {
        ydl_100: {
          label: 'Yardline (yds to end zone)',
          short_label: 'Yds to EZ',
          data_type: TABLE_DATA_TYPES.RANGE,
          min: 0,
          max: 99,
          show_key_in_short: true
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { ydl_100: [0, 19] },
      variant: 'long'
    })
    expect(result).to.equal('Yardline (yds to end zone): <19')
  })

  it('falls back to label in short prefix when short_label is absent', () => {
    const column_def = {
      column_params: {
        year_offset: {
          label: 'Year + N',
          show_key_in_short: true
        }
      }
    }
    const result = format_column_params({
      column_def,
      column_state_params: { year_offset: 0 },
      variant: 'short'
    })
    expect(result).to.equal('Year + N: 0')
  })
})
