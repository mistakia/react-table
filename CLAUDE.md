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
    table-row-axes-controls/  # Row axis selection (e.g. year, week)
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
  row_axes: [string],  // optional; axes the row key extends along (e.g. 'year', 'week')
  prefix_columns: [],
  rank_aggregation: {},
  row_grain: [string]  // optional; what each row represents (e.g. 'player' vs 'team')
}
```

**Pinned columns are capped by a width budget, so a `prefix_columns` entry is a REQUEST to pin, not a guarantee.** `prefix_columns` render sticky only while the running total stays under `STICKY_WIDTH_BUDGET_RATIO` (half) of the scroll container's measured width; the rest render unpinned and scroll normally, re-resolved on resize. The first one is always pinned. A consumer seeing a column unpin itself on a phone is looking at this and not at a bug — five prefix columns come to roughly 470px, which covers a 390px viewport entirely and leaves no width in which any data column can be scrolled into view. The admission rule is `src/utils/resolve-sticky-column-ids.js`, unit-tested at `test/resolve-sticky-column-ids.spec.mjs`.

**Every row kind must reserve the trailing add-column control's width** (`ADD_COLUMN_ACTION_WIDTH`, via `AddColumnActionSpacer`). A row that skips it comes out narrower than the scroll extent, and a sticky cell cannot be pushed past its own row's right edge — at maximum horizontal scroll the trailing pinned columns then clamp short of their offsets and slide on top of each other, hiding a column outright.

**A view with no selected columns and no rows draws NO header row, and offers no Save.** Both are `table.js` reading `table_state.columns` rather than the rendered header: prefix columns still resolve on an empty view, so a header suppressed only when it came out empty still ruled a Name / Team / Pos strip over the empty state that exists to say the view has no columns. Save is gated because `is_table_state_changed` is true whenever there is no saved state at all — a fresh empty view therefore put the loudest control in the toolbar behind the one action with nothing to save. Emptying a SAVED view still offers both, so the change stays revertible. The same condition puts `-attention` on `TableColumnControls`, which pulses the Columns button three times and then holds an accent colour — an animation that never stops reads as an error indicator, and one that leaves nothing behind is missed by anyone who looked away. `test/table-empty-view.spec.jsx`.

**Empty state:** Pass `empty_state` (a node) to render it in place of the body when `!is_loading && rows.length === 0`. The body and footer both render only on a non-empty row set, so without it an empty table draws its header over blank page with nothing saying why. The lib supplies the placement and leaves the copy to the consumer, because what an empty result MEANS is a consumer question — no columns picked yet, no rows matched, no access — and a consumer that passes nothing renders exactly as before. The wrapper is `position: sticky; left: 0` for the same reason as `.table-footer-metadata`: the table is a horizontal scroll container, so a statically positioned child is off screen at any non-zero scroll offset, which is indistinguishable from rendering nothing.

**Row-grain control:** Pass `row_grain_options` (an array of `{ value, label }`) and `on_row_grain_change` (callback) to the `Table` component to render a `TableSegmentedSelect` switch in the toolbar. The widget is generic -- consumers supply both the values and the display labels. Active value reads from `table_state.row_grain[0]`. Consumers that don't pass `row_grain_options` see no toggle and incur no cost.

**Row-axes control:** The `TableRowAxesControls` widget renders when any selected column declares a non-empty `row_axes` array on its column definition. Pass `disable_row_axes` to suppress it entirely.

**Offering an axis is a per-column question; SHARING one is not.** The picker unions `row_axes` across the selected columns, which is right for an axis whose rows mean the same thing to everybody (every column agrees what the year 2024 is) and wrong for an axis keyed on a VALUE, where two columns can both offer it honestly and mean different things by it. A column definition may therefore carry `row_axis_domain`, an object mapping an axis name to a string naming what that column's rows along that axis are values OF; columns declaring different domains for one axis cannot share it, and `resolve_row_axis_conflicts` (`src/utils/resolve-row-axis-conflicts.js`, `test/resolve-row-axis-conflicts.spec.mjs`) reports the disagreement so `TableRowAxesControls` can disable the option and name both sides. Declaring no domain for an offered axis is SILENCE, not disagreement — a column that contributes no rows of its own must not refuse the views it joins. The conflict is reported, never repaired: `row_axes` is reversible user state, so dropping the axis from a stored table state would turn an undoable selection into data loss.

`row_axes` and `row_axis_domain` may each be a function of the column instance's params instead of a plain value, resolved per instance in `src/utils/resolve-table-state-columns.js` (`test/resolve-table-state-columns.spec.mjs`) alongside `reverse_percentiles` and `fixed`. Use the function form when whether an axis is answerable depends on the params rather than on the column id — a betting column can only be split by line when its `market_type` posts a ladder of lines, and offering the axis for a single-line market produces a request the server refuses. Returning `[]` or omitting the field suppresses the control for that instance. Do NOT pass a function to a consumer that predates this: the picker flat-maps `row_axes`, so an unresolved function object becomes a selectable option rather than an error. Pass `row_axes_label` (default `'Row axes'`) and `no_row_axes_available_label` (default `'No row axes available for selected columns'`) to control the button label and the empty-state message. Consumers can pass domain-specific copy (e.g. `row_axes_label="Splits"`) without touching the widget code.

**Custom param components:** A param definition may carry `component`, and `ParametersEditorItem` renders it in place of the `data_type` dispatch, passing `column_param_name`, `column_param_definition`, `selected_param_values`, `handle_change`, `mixed_state`, `row_axes`, plus `column` / `column_index` / `set_local_table_state` when the record is a single column (absent for where-clause records and bulk edit — a custom component must render without them). Those three handles are what let a custom component compose `ColumnParamSelectFilterWithOverrides` and get the sibling-param override panel instead of reimplementing table-state writes.

**Under bulk edit, each param is resolved across EVERY selected record, not taken from whichever column was ticked first.** `ParametersEditor` calls `resolve_param_definition_across_records` (`src/utils/resolve-param-definition-across-records.js`) once per param name and renders the result. Values intersect, `min`/`max` take the tightest overlap, `enable_multi_on_split` intersects rather than unions, and a `default_value` outside the merged set is dropped — so the control offers only what can be written to all of them. Where they cannot be reconciled the param is REFUSED rather than resolved: `ParametersEditorConflict` renders in place of the control, naming the columns on each side and both remedies (deselect one group, or set the param per column). `CONFLICT_REASONS` is closed at three — `arity_conflict` (`is_single` disagreement), `no_admissible_values` (empty intersection), and `incompatible_control` (`data_type` / `component` / `column_specs` disagreement, which makes the written shape unknowable). A refused param is left untouched by the write; siblings still resolve and render normally.

**Arity is two fields and only one of them is repaired.** `single` is SELECT-only and caps LENGTH (SELECT stores a list either way), modulated by `enable_multi_on_split` against the active row axes. `is_single` is RANGE-only and changes SHAPE — a scalar rather than a `[min, max]` pair. `is_param_value_admissible` judges `is_single` and deliberately does not judge `single`: `single`'s verdict flips with a reversible row-axis toggle, and since an inadmissible value is overwritten with the default, judging it would destroy a legitimate multi-value list the moment a user turned a split off and edited any sibling.

**`selected_param_values` is a LIST, and a scalar is a data quirk the built-in filter now absorbs rather than a crash.** `ColumnParamSelectFilter` normalizes a non-null scalar to a one-element list at the top of the component (since 2026-08-19, `test/column-param-select-filter.spec.jsx`), so a stored scalar like `seas_type: "REG"` renders as that single value instead of throwing `selected_param_values?.forEach is not a function` inside a `useEffect` (which used to mean an error boundary and a blank page). A custom component composing the built-in filters for its OWN sub-fields must still wrap each scalar in a single-element array — the normalization lives in `ColumnParamSelectFilter`, not in the helpers a custom component calls directly — and pass `null` (not `[]`) when unset: `Boolean(selected_param_values)` is how a control decides the param is defined, and `[]` is truthy, so an empty array styles the chip as though it held a value. Nothing else catches this short of rendering the control — it survives lint, the webpack build, and any test that only asserts emitted SQL.

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
  name: {
    column_id: 'name',
    header_label: 'Name',
    accessorKey: 'name',
    data_type: 2
  }, // TEXT
  age: {
    column_id: 'age',
    header_label: 'Age',
    accessorKey: 'age',
    data_type: 1
  } // NUMBER
}

const table_state = {
  columns: ['name', 'age'],
  sort: [{ column_id: 'name', desc: false }],
  where: []
}

function MyTable({ data }) {
  return (
    <Table data={data} all_columns={all_columns} table_state={table_state} />
  )
}
```

### Validation API

```javascript
import {
  validate_table_state,
  validate_where_clause
} from '@mistakia/react-table'

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
  search: { type: 'where', column_id: 'title' } // server-side ILIKE
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
  const highlights =
    table?.options?.meta?.row_highlights?.[row.original.base_uri]
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
