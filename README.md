# React Table Component

React table component using TanStack/react-table and Material-UI.

## Installation

```bash
npm install @mistakia/react-table
```

## Basic Usage

```javascript
import Table from '@mistakia/react-table'

const all_columns = {
  name: {
    column_id: 'name',
    header_label: 'Name',
    accessorKey: 'name',
    data_type: 2 // TEXT
  },
  age: {
    column_id: 'age',
    header_label: 'Age',
    accessorKey: 'age',
    data_type: 1 // NUMBER
  }
}

const table_state = {
  columns: ['name', 'age'],
  sort: [{ column_id: 'name', desc: false }],
  where: []
}

const data = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
]

function MyTable() {
  return (
    <Table data={data} all_columns={all_columns} table_state={table_state} />
  )
}
```

## Schema Documentation

Complete JSON Schema documentation is available in the [`schema/`](./schema/) directory:

- [`schema/index.json`](./schema/index.json) - Component props schema with examples
- [`schema/state/table-state.json`](./schema/state/table-state.json) - Table state configuration
- [`schema/columns/column-definition.json`](./schema/columns/column-definition.json) - Column definition schema
- [`schema/base/table-data-types.json`](./schema/base/table-data-types.json) - Data type constants
- [`schema/base/table-operators.json`](./schema/base/table-operators.json) - Filter operators

## Validation

Runtime validation for table state objects using AJV JSON Schema validation with security patterns.

```javascript
import { validate_table_state } from 'react-table'

const result = validate_table_state(table_state)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

### Security Patterns

Where clause values are validated to prevent SQL injection:

- Blocks dangerous SQL keywords: `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`, `MERGE`, `EXEC`
- Prevents SQL comment sequences and dangerous characters
- String length limits (max 200 characters) and array size limits (max 100 items)
- Only allows predefined safe operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`, `IS NULL`, `IS NOT NULL`, `IN`, `NOT IN`

### Design Decisions

- AJV chosen over fastest-validator for native JSON Schema `$ref` resolution
- Schemas bundled inline for browser compatibility
- Security validation runs separately from schema validation for detailed error reporting
- Enable `enable_validation_warnings` prop to log validation errors to console

## Search Adapters

The Table renders a debounced search input when `selected_view.search` is set. The `view.search.type` selects a registered `SearchAdapter`; the rest of the object is adapter-specific configuration.

### View configuration

```javascript
selected_view = {
  // ... standard view fields
  search: { type: 'where', column_id: 'title' } // single-column ILIKE
  // search: { type: 'client', fields: ['title', 'description'], key_field: 'id' }
  // search: { type: 'server_q', entity_type: 'thread' }
}
```

If `search` is absent, no input renders. If `search.type` is unknown, the input renders disabled with a console warning so misconfiguration is loud.

### Built-in adapters

| id       | Where filtering happens                     | Returns                                           |
| -------- | ------------------------------------------- | ------------------------------------------------- |
| `client` | In-memory in the browser                    | `client_filter` predicate (and inline highlights) |
| `where`  | Server-side via the existing `where` clause | `state_patch.where`                               |

Both self-register on module load via `register_search_adapter`.

### Adapter contract

```javascript
{
  id: string,
  validate(view_search_config) -> string | null,    // null on valid config
  async run({ query, table_state, current_rows, view_search_config, signal })
    -> { state_patch?, client_filter?, highlights? }
}
```

`SearchResult.highlights` is a plain object keyed by the consumer's row primary key (URI for entity-keyed tables, `thread_id` for threads, `base_uri` for tasks). Values are `RowHighlights = { matched_field, cell_ranges: { [column_id]: Range[] }, snippet: { text, ranges } | null }` — the same shape on the wire, in Redux, and at the cell renderer.

### Registering a custom adapter

```javascript
import { register_search_adapter } from 'react-table/src/search/registry.js'

const my_adapter = {
  id: 'my_backend',
  validate: (cfg) => (cfg.endpoint ? null : 'endpoint required'),
  async run({ query, view_search_config, signal }) {
    if (!query.trim()) return { state_patch: { q: null } }
    const res = await fetch(view_search_config.endpoint, { signal })
    return { state_patch: { q: query }, highlights: await res.json() }
  }
}

register_search_adapter(my_adapter)
```

Side-effect import the registration site at app startup so the adapter is registered before any table mounts.

### Quick-search transport

`q` is an optional `table_state` field, sibling to `where` / `sort` / `limit` / `offset`. Adapters that filter server-side write a `state_patch` containing `q` (or `where`); the table's own `on_table_state_change` flow propagates the change. Servers that consume `q` are expected to enforce a minimum query length and to attach a `row_highlights` map to their response so cell renderers can paint inline matches via TanStack `meta.row_highlights`.

### Highlighting cells

```javascript
import HighlightedText from 'react-table/src/search/highlighted-text.js'

const TitleCell = ({ row, table }) => {
  const highlights =
    table?.options?.meta?.row_highlights?.[row.original.base_uri]
  const ranges = highlights?.cell_ranges?.title || []
  return <HighlightedText text={row.original.title} ranges={ranges} />
}
```

Pass `row_highlights` as a prop to `<Table>`; the component places it on TanStack `meta.row_highlights` for cell renderers to consume.

## License

MIT
