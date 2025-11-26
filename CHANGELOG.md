# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- AJV JSON Schema validation for table state with SQL injection prevention
- `validate_table_state`, `validate_where_clause`, `validate_sort_array`, `validate_columns_array` functions
- `disable_scatter_plot`, `disable_column_controls`, `disable_multi_sort` table state options
- `enable_validation_warnings` prop to enable validation console warnings

### Dependencies

- Added `ajv` (^8.12.0) and `ajv-formats` (^2.1.1)
