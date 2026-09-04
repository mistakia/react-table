# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Sticky-column width budget: pinned columns past 50% of the scroll container's
  visible width render unpinned, so a wide prefix set no longer covers a narrow
  viewport entirely. The first pinned column is always kept.

### Fixed

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
