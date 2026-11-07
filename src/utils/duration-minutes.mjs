// A duration is typed as a whole number with a unit -- `90m`, `4h`, `2d` --
// or a bare `0`, and is filtered as minutes. The where value stays a number,
// so a server comparing a minutes column needs no change.
const UNIT_MINUTES = { d: 1440, h: 60, m: 1 }
const DURATION_PATTERN = /^(\d+)([mhd])$/

// Minutes for a duration string, or null when the text is not one.
export const parse_duration_minutes = (text) => {
  if (typeof text !== 'string') return null
  const trimmed = text.trim().toLowerCase()
  if (trimmed === '0') return 0
  const match = DURATION_PATTERN.exec(trimmed)
  if (!match) return null
  return Number(match[1]) * UNIT_MINUTES[match[2]]
}

// The largest whole unit for a minute count: 1440 -> `1d`, 240 -> `4h`,
// 90 -> `90m`. Anything that is not a non-negative whole number of minutes
// is returned as written so a hand-edited bound still shows.
export const format_duration_minutes = (minutes) => {
  if (minutes === undefined || minutes === null || minutes === '') return ''
  const value = Number(minutes)
  if (!Number.isInteger(value) || value < 0) return String(minutes)
  if (value === 0) return '0'
  if (value % UNIT_MINUTES.d === 0) return `${value / UNIT_MINUTES.d}d`
  if (value % UNIT_MINUTES.h === 0) return `${value / UNIT_MINUTES.h}h`
  return `${value}m`
}
