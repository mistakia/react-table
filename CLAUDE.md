# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
