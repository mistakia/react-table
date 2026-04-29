import { register_search_adapter } from '#src/search/registry.js'

const where_adapter = {
  id: 'where',

  validate(view_search_config) {
    if (!view_search_config || !view_search_config.column_id) {
      return 'where adapter requires view.search.column_id'
    }
    return null
  },

  async run({ query, table_state, view_search_config }) {
    const column_id = view_search_config.column_id
    const operator = view_search_config.operator || 'ILIKE'
    const trimmed = (query || '').trim()
    const prior_where = Array.isArray(table_state && table_state.where)
      ? table_state.where
      : []
    const without_target = prior_where.filter(
      (entry) =>
        !(entry && entry.column_id === column_id && entry.operator === operator)
    )

    const next_where = trimmed
      ? [...without_target, { column_id, operator, value: trimmed }]
      : without_target

    return { state_patch: { where: next_where } }
  }
}

register_search_adapter(where_adapter)

export default where_adapter
