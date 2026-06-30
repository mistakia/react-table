# Table cell

`table-cell.js` renders one body cell. It resolves the cell value (handling splits and duplicate column ids), applies the optional percentile-color background, formats booleans / `fixed` decimals / objects, and supports a custom `column.columnDef.component` that fully replaces default rendering.

## Layout

- `table-cell.js` — `TableCell` implementation (`React.memo`).
- `index.js` — export.

## Null rendering (`render_null` / `meta.render_null`)

Default rendering is unchanged: a `null`/`undefined` value renders as a blank cell, a real `0` renders as `0`, and percentile coloring is skipped for null (a null cell is never colored as if it were zero).

When a value is `null`/`undefined`, the cell defers to a render hook if one is provided, letting a column decide what a missing cell shows without bypassing the default formatting path:

1. `column.columnDef.render_null` (per-column), else
2. `table.options.meta?.render_null` (table-wide fallback).

The hook is called with `{ value, row, column, column_index, table }` and its return is rendered in place of the blank. Because it receives the full `row`, it can read sibling fields (e.g. a hidden status column) to disambiguate distinct "no value" states — for example showing `0` for active-but-zero versus a marker for a known absence. Without a hook, null still renders blank.

This differs from `column.columnDef.component`, which replaces rendering for every value (not just null) and bypasses all default formatting.

## Related

- `../table/table.js` — wires `table.options.meta` (including `render_null` and `row_highlights`).
- `../search/highlighted-text.js` — used by custom cell components for inline match highlighting.
