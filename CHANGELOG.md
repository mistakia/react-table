# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

This project does not use semantic versioning. Instead, it uses specific commit hashes when used as a dependency in other projects.

## [Unreleased]

### Added
- `disable_scatter_plot` option in table state to hide scatter plot menu options from column headers
- `disable_column_controls` option in table state to disable column controls including add column button and column header interactions

### Changed
- Column headers now respect `disable_column_controls` setting by hiding menu interactions and add column functionality
- Scatter plot menu options in column headers are now conditionally displayed based on `disable_scatter_plot` setting

### Schema Updates
- Added `disable_scatter_plot` boolean property to `schema/state/table-state.json`
- Added `disable_column_controls` boolean property to `schema/state/table-state.json`