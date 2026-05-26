const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
]

export const format_relative_time = (timestamp) => {
  const diff_seconds = (timestamp - Date.now()) / 1000
  const abs = Math.abs(diff_seconds)
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === 'second') {
      return rtf.format(Math.round(diff_seconds / secs), unit)
    }
  }
}
