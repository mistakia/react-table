import { SHARE_LINK_URL_SCHEMA } from '#src/constants.mjs'

const parse_json_with_fallback = (raw, fallback) => {
  if (raw === null || raw === '') return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch (error) {
    return fallback
  }
}

export const parse_url_params_to_table_state = (search_params) => {
  const table_state = {}
  for (const [key, type] of Object.entries(SHARE_LINK_URL_SCHEMA.table_state)) {
    const raw = search_params.get(key)
    if (type === 'array') {
      table_state[key] = parse_json_with_fallback(raw, [])
    } else if (type === 'object') {
      table_state[key] = parse_json_with_fallback(raw, {})
    } else if (type === 'string') {
      table_state[key] = raw || ''
    } else if (type === 'boolean') {
      table_state[key] = raw === 'true'
    }
  }

  const view_fields = {}
  for (const key of SHARE_LINK_URL_SCHEMA.view) {
    view_fields[key] = search_params.get(key) || ''
  }

  return { table_state, view_fields }
}
