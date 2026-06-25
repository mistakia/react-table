# React Table

A virtualized React table built on TanStack/react-table and Material-UI. Renders large datasets, supports parameterized filtering, custom views, row axes, rank aggregation, search, and CSV / JSON / Markdown export.

## Capabilities

- **Virtualized rendering** — handles large row counts via TanStack React Virtual; memoized rows and headers; sticky prefix columns.
- **Column controls** — drag-and-drop reordering, visibility toggling, fuzzy column search, tree-view categorization, and per-column parameter editing.
- **Parameterized filtering** — server-side `where` clauses with 14 safe operators across 9 data types; type-specific operator whitelisting; nested filtering on column metadata.
- **Quick filter** — checkbox multi-select via Autocomplete for picking subset values fast.
- **Multi-column sort** — additive sort with directional indicators.
- **Row axes & rank aggregation** — expand rows along additional axes (e.g. year, week); build weighted multi-column rankings.
- **Saved views** — create, edit, delete, favorite, and revert views; views carry their own columns, filters, row axes, prefix columns, rank-aggregation weights, search config, and scatter-plot settings.
- **Search** — pluggable adapter registry: client (in-memory fuzzy with byte-range highlights), server (`where`-clause injection), or custom backends. Debounced input; cell renderers paint inline match highlights.
- **Scatter plot overlay** — Highcharts-rendered dual-axis scatter with linear-regression trend, tier-based coloring, T-distribution confidence intervals, and configurable point labels (value, color, image, suffix).
- **Export** — CSV (RFC 4180 with quote escaping and CRLF), JSON (filename prefix + ISO timestamp), Markdown table (pipe escaping).
- **Shareable state** — full table state (columns, sort, where, row axes, prefix columns, rank aggregation, scatter options, search query) is serialisable for URL sharing or persistence.

## Data Types and Operators

Data types: `NUMBER`, `TEXT`, `JSON`, `BOOLEAN`, `DATE`, `BINARY_UUID`, `SELECT`, `RANGE`, `OBJECT_PRESET`.

Operators (whitelisted per type): `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`, `IS NULL`, `IS NOT NULL`, `IN`, `NOT IN`.

## Search Modes

| Adapter id | Where filtering runs                            | Returns                                             |
| ---------- | ----------------------------------------------- | --------------------------------------------------- |
| `client`   | In-memory in the browser                        | `client_filter` predicate plus inline highlights    |
| `where`    | Server-side via the existing `where` clause     | `state_patch.where`                                 |
| custom     | Anywhere — register via `register_search_adapter` | Adapter-defined                                     |

## Security & Validation

Table state goes through AJV JSON Schema validation plus custom security keywords:

- Blocks the SQL keywords `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`, `MERGE`, `EXEC` and comment sequences inside `where` values.
- Caps string values at 200 characters and arrays at 100 items.
- Only the whitelisted operators above are accepted.

## License

MIT
