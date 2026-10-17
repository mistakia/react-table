# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Row axis range bounds: a split column whose supplied values are all numbers
  (a year axis) also offers Min / Max in its header filter, writing `>=` / `<=`
  rows on the axis id, so a span of seasons is two rows rather than a list.
- Where value pairs: the secure where-value schema admits a list of two-item
  tuples, the shape of a row filter keeping exact `[id, season]` rows. Each
  string in a tuple passes the same string checks as a bare value.
- Row axis header filter: a split column whose axis the consumer supplies
  values for through the new `row_axis_values` prop offers an include/exclude
  value list in its header menu. It writes an ordinary `where` row keyed on the
  axis id (`{ column_id: 'year', operator: 'IN', value: [2024] }`), and that row
  is dropped once the axis leaves `row_axes`.
- Sticky-column width budget: pinned columns past 50% of the scroll container's
  visible width render unpinned, so a wide prefix set no longer covers a narrow
  viewport entirely. The first pinned column is always kept.

### Fixed

- The scatter plot and bar chart PNG exports keep the chart's on-screen size
  instead of collapsing to a square. The export handed Highcharts no size, so it
  fell back to a 600x600 source and squished the rendered chart into it.

- A copied share link names the route that READS a query string rather than the
  route the user is standing on, via the new `share_link_pathname` prop. On a
  consumer route that hydrates a stored record — a saved view, a shared
  generation, a resolved short link — the query string is ignored on load, so a
  link built from the current path published the stored view while carrying the
  on-screen state in a query string no reader ever looked at. The copier saw one
  view and every reader got another, with nothing on either side reporting the
  discrepancy. Consumers that declare no route are unaffected

- The column, filter and row-axes managers open as `fixed` surfaces anchored to
  their button, so an ancestor with non-visible overflow no longer clips them.
  They previously only rendered fully inside a full-page scroll container; in
  any smaller consumer container they opened as a clipped sliver. Their height
  is also capped to the viewport and flipped upward when there is no room below
- The footer row pins with the same columns as the header and body, and the
  row-count metadata stays at the left edge on horizontal scroll
- Every row kind reserves the trailing add-column control's width, so rows no
  longer come out narrower than the scroll extent and pinned columns can reach
  their offsets at maximum horizontal scroll instead of overlapping
- The footer renders only its leaf group; the group rows above it were empty
  but still consumed a row's height each

- AJV JSON Schema validation for table state with SQL injection prevention
- `validate_table_state`, `validate_where_clause`, `validate_sort_array`, `validate_columns_array` functions
- `disable_scatter_plot`, `disable_column_controls`, `disable_multi_sort` table state options
- `enable_validation_warnings` prop to enable validation console warnings

### Dependencies

- Added `ajv` (^8.12.0) and `ajv-formats` (^2.1.1)
