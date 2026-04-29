const adapters = new Map()

export const register_search_adapter = (adapter) => {
  if (!adapter || typeof adapter.id !== 'string' || !adapter.id) {
    throw new Error('register_search_adapter: adapter.id is required')
  }
  if (adapters.has(adapter.id)) {
    throw new Error(
      `register_search_adapter: duplicate id "${adapter.id}"`
    )
  }
  adapters.set(adapter.id, adapter)
}

export const get_search_adapter = (id) => {
  if (!id) return null
  return adapters.get(id) || null
}

export const list_search_adapters = () => Array.from(adapters.values())
