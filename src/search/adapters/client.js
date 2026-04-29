import { register_search_adapter } from '#src/search/registry.js'

const get_field_value = (row, field) => {
  if (row == null) return ''
  const value = typeof row.get === 'function' ? row.get(field) : row[field]
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

const collect_ranges = (haystack, needle) => {
  const ranges = []
  if (!haystack || !needle) return ranges
  const haystack_lower = haystack.toLowerCase()
  const needle_lower = needle.toLowerCase()
  let from = 0
  while (from <= haystack_lower.length - needle_lower.length) {
    const idx = haystack_lower.indexOf(needle_lower, from)
    if (idx === -1) break
    ranges.push({ offset: idx, length: needle_lower.length })
    from = idx + needle_lower.length
  }
  return ranges
}

const get_row_key = (row, key_field) => {
  if (key_field) return get_field_value(row, key_field)
  if (row && row.id != null) return String(row.id)
  if (row && row.uri != null) return String(row.uri)
  return null
}

const client_adapter = {
  id: 'client',

  validate(view_search_config) {
    if (
      !view_search_config ||
      !Array.isArray(view_search_config.fields) ||
      view_search_config.fields.length === 0
    ) {
      return 'client adapter requires view.search.fields to be a non-empty array'
    }
    return null
  },

  async run({ query, current_rows = [], view_search_config }) {
    const fields = view_search_config.fields
    const key_field = view_search_config.key_field || null
    const trimmed = (query || '').trim()

    if (!trimmed) {
      return { client_filter: null, highlights: {} }
    }

    const highlights = {}
    const matched_set = new Set()

    for (const row of current_rows) {
      let matched_field = null
      const cell_ranges = {}

      for (const field of fields) {
        const value = get_field_value(row, field)
        const ranges = collect_ranges(value, trimmed)
        if (ranges.length > 0) {
          if (!matched_field) matched_field = field
          cell_ranges[field] = ranges
        }
      }

      if (matched_field) {
        matched_set.add(row)
        const row_key = get_row_key(row, key_field)
        if (row_key != null) {
          highlights[row_key] = {
            matched_field,
            cell_ranges,
            snippet: null
          }
        }
      }
    }

    return {
      client_filter: (rows) => rows.filter((row) => matched_set.has(row)),
      highlights
    }
  }
}

register_search_adapter(client_adapter)

export default client_adapter
