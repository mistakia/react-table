# Search subsystem

The library's pluggable search adapter system. Tables that opt in via `view.search` get a debounced search input; the configured adapter translates the query into a TanStack-friendly result.

## Layout

- `adapter-contract.js` — JSDoc typedefs for `Range`, `Snippet`, `RowHighlights`, `SearchResult`, `SearchAdapter`. Single source of truth for the contract.
- `registry.js` — module-scope `Map`. Exports `register_search_adapter`, `get_search_adapter`, `list_search_adapters`. Throws on duplicate id; returns `null` for unknown ids.
- `highlighted-text.js` — `<HighlightedText text ranges />` primitive. Pure render of plain text with highlight ranges; clamps out-of-bounds ranges.
- `table-search-input.js` — user-facing input with 500 ms debounce and `AbortController`. Looks up adapter via the registry, applies `state_patch` / `client_filter` / `highlights` from the adapter's result.
- `adapters/client.js` — built-in: in-memory predicate filter for tables that already hold their data client-side.
- `adapters/where.js` — built-in: writes a single ILIKE entry into `table_state.where`. Replacement for the legacy `TableSearch`.

## Built-in adapters

| id       | Where the work happens                  | Returns                                  |
| -------- | --------------------------------------- | ---------------------------------------- |
| `client` | In-memory in the browser                | `client_filter` predicate + `highlights` |
| `where`  | Server-side via existing `where` clause | `state_patch.where`                      |

Custom adapters are registered by consuming projects at startup; see the README "Search Adapters" section. Base contributes `server_q` (drives `table_state.q`).

## Data shapes

`view.search`: `{ type: 'client' | 'where' | 'server_q' | <custom>, ...adapter_specific_fields }`. Absent means no input renders.

`RowHighlights`: `{ matched_field, cell_ranges: { [column_id]: Range[] }, snippet: { text, ranges } | null }`. Plain object — same shape on the wire, in Redux, and at the cell renderer.

`Range`: `{ offset, length }`.

## Related

- `../table/table.js` — wires `view.search` into the rendered input and routes `row_highlights` into TanStack `meta.row_highlights`.
- `../table-cell/table-cell.js` — passes `table` (and therefore `table.options.meta.row_highlights`) into custom cell components.
- `../table-menu/table-menu.js` — URL serialization round-trips `view.search` and `table_state.q`.
- Base server filter mode: `repository/active/base/libs-server/search/filter-mode.mjs` (orchestrator entry) and `repository/active/base/libs-server/table/search-filter.mjs` (request-processor helper).
