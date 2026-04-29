import { describe, expect, test, beforeEach } from 'bun:test'

let registry_module

async function fresh_registry() {
  // Force re-import so each test gets an isolated registry.
  const url =
    '../../src/search/registry.js?fresh=' + Math.random().toString(36).slice(2)
  registry_module = await import(url)
  return registry_module
}

describe('search adapter registry', () => {
  beforeEach(async () => {
    await fresh_registry()
  })

  test('register_search_adapter stores by id', () => {
    const adapter = { id: 'a1', validate: () => null, run: async () => ({}) }
    registry_module.register_search_adapter(adapter)
    expect(registry_module.get_search_adapter('a1')).toBe(adapter)
  })

  test('rejects registration without an id', () => {
    expect(() =>
      registry_module.register_search_adapter({ validate: () => null })
    ).toThrow(/adapter\.id is required/)
  })

  test('rejects duplicate id', () => {
    const a = { id: 'dup', validate: () => null, run: async () => ({}) }
    const b = { id: 'dup', validate: () => null, run: async () => ({}) }
    registry_module.register_search_adapter(a)
    expect(() => registry_module.register_search_adapter(b)).toThrow(
      /duplicate id/
    )
  })

  test('get_search_adapter returns null for unknown ids', () => {
    expect(registry_module.get_search_adapter('missing')).toBeNull()
    expect(registry_module.get_search_adapter()).toBeNull()
  })

  test('list_search_adapters enumerates registered adapters', () => {
    const a = { id: 'a', validate: () => null, run: async () => ({}) }
    const b = { id: 'b', validate: () => null, run: async () => ({}) }
    registry_module.register_search_adapter(a)
    registry_module.register_search_adapter(b)
    expect(registry_module.list_search_adapters()).toEqual([a, b])
  })
})
