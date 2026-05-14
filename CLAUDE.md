# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For graph context (consumers, related task dir, table-state schema location), see [ABOUT.md](ABOUT.md).

## Build Commands

```bash
yarn build      # Production build (outputs to dist/react-table.js)
yarn lint       # ESLint validation
yarn prettier   # Format all files with Prettier
```

The build uses Webpack 5 with Babel transpilation. Output is an ES module targeting browsers.

## Architecture

This is a React table component library built on TanStack/react-table and Material-UI. It provides filtering, sorting, column controls, virtualization, and data export.

### Entry Point

`index.js` exports:

- Default: Main Table component
- Named: Validation functions (`validate_table_state`, `validate_where_clause`, etc.)

### Source Structure

```
src/
  table/                    # Main table component
  table-*/                  # Feature components (15+)
    table-column-controls/  # Column visibility/ordering with drag-and-drop
    table-filter-controls/  # Advanced filtering UI
    table-quick-filter/     # Quick filter with checkboxes
    table-search/           # Full-text search
    table-view-controller/  # View management
    table-splits-controls/  # Data grouping/splitting
  filter-*/                 # Filter control variations
  column-controls-*/        # Column control variations
  utils/                    # Utility functions (16 files)
  validators/               # AJV JSON Schema validation with security
  styles/                   # Stylus stylesheets
  constants.mjs             # Data types, operators, configuration
  table-context.js          # React Context for table state
```

### Key Patterns

**Table State Structure:**

```javascript
{
  sort: [{ column_id: string, desc: boolean }],
  columns: [string | { column_id: string, params: object }],
  where: [{ column_id: string, operator: string, value: any, params?: object }],
  splits: [],
  prefix_columns: [],
  rank_aggregation: {}
}
```

**Component Pattern:** Each component directory contains `index.js` (export) and `component-name.js` (implementation).

**Performance:** Uses `@tanstack/react-virtual` for virtualization, `React.memo` for memoized rows/headers, and custom debounce/throttle utilities.

**State Management:** Controlled component pattern via `on_table_state_change` prop. Context API (`table-context.js`) for shared state distribution.

### Validation System

Located in `src/validators/`. Uses AJV with custom security patterns to prevent SQL injection in where clauses.

**Security constraints:**

- Blocked keywords: DELETE, DROP, TRUNCATE, ALTER, UPDATE, INSERT, MERGE, EXEC
- String length max: 200 characters
- Array size max: 100 items
- Safe operators only: =, !=, >, >=, <, <=, LIKE, NOT LIKE, ILIKE, NOT ILIKE, IS NULL, IS NOT NULL, IN, NOT IN

### Data Types

Defined in `src/constants.mjs`:

- NUMBER (1), TEXT (2), JSON (3), BOOLEAN (4), DATE (5), BINARY_UUID (6), SELECT (7), RANGE (8)

### Column Definition

Columns are defined via `all_columns` prop as an object mapping column IDs to column configuration:

```javascript
{
  column_id: {
    column_id: string,
    column_name: string,
    header_label: string,
    data_type: number,  // From TABLE_DATA_TYPES
    groups: [{ group_id: string, group_label: string }],
    // ... additional column config
  }
}
```

## Code Style

- snake_case for functions and variables
- PropTypes validation on all components
- No semicolons (Prettier configured)
- Single quotes for strings

## Consumer Integration

For external consumers of the published package.

### Install

```bash
npm install @mistakia/react-table
```

### Basic Usage

```javascript
import Table from '@mistakia/react-table'

const all_columns = {
  name: { column_id: 'name', header_label: 'Name', accessorKey: 'name', data_type: 2 }, // TEXT
  age:  { column_id: 'age',  header_label: 'Age',  accessorKey: 'age',  data_type: 1 }  // NUMBER
}

const table_state = {
  columns: ['name', 'age'],
  sort: [{ column_id: 'name', desc: false }],
  where: []
}

function MyTable({ data }) {
  return <Table data={data} all_columns={all_columns} table_state={table_state} />
}
```

### Validation API

```javascript
import { validate_table_state, validate_where_clause } from '@mistakia/react-table'

const result = validate_table_state(table_state)
if (!result.valid) console.error(result.errors)
```

Enable `enable_validation_warnings` prop to log validation errors to the console.

### Search Adapters

Adapter contract:

```javascript
{
  id: string,
  validate(view_search_config) -> string | null,    // null on valid config
  async run({ query, table_state, current_rows, view_search_config, signal })
    -> { state_patch?, client_filter?, highlights? }
}
```

Register at app startup (before any table mounts):

```javascript
import { register_search_adapter } from 'react-table/src/search/registry.js'

register_search_adapter({
  id: 'my_backend',
  validate: (cfg) => (cfg.endpoint ? null : 'endpoint required'),
  async run({ query, view_search_config, signal }) {
    if (!query.trim()) return { state_patch: { q: null } }
    const res = await fetch(view_search_config.endpoint, { signal })
    return { state_patch: { q: query }, highlights: await res.json() }
  }
})
```

View configuration selects the adapter:

```javascript
selected_view = {
  search: { type: 'where',  column_id: 'title' }                       // server-side ILIKE
  // or:  { type: 'client', fields: ['title', 'description'], key_field: 'id' }
  // or:  { type: 'my_backend', endpoint: '/api/search' }
}
```

### Quick-Search Transport

`q` is an optional `table_state` field, sibling to `where` / `sort` / `limit` / `offset`. Server-side adapters write a `state_patch` containing `q` (or a `where`); the table's `on_table_state_change` propagates it. Servers consuming `q` are expected to enforce a minimum query length and attach a `row_highlights` map to their response so cell renderers can paint inline matches via TanStack `meta.row_highlights`.

### Highlighting Cells

```javascript
import HighlightedText from 'react-table/src/search/highlighted-text.js'

const TitleCell = ({ row, table }) => {
  const highlights = table?.options?.meta?.row_highlights?.[row.original.base_uri]
  const ranges = highlights?.cell_ranges?.title || []
  return <HighlightedText text={row.original.title} ranges={ranges} />
}
```

Pass `row_highlights` as a prop to `<Table>`; the component places it on TanStack `meta.row_highlights` for cell renderers to consume. `RowHighlights` shape: `{ matched_field, cell_ranges: { [column_id]: Range[] }, snippet: { text, ranges } | null }`.

### Schemas

JSON Schema definitions live under `schema/`:

- `schema/index.json` — component props
- `schema/state/table-state.json` — table state
- `schema/columns/column-definition.json` — column definition
- `schema/base/table-data-types.json` — data type constants
- `schema/base/table-operators.json` — filter operators
