---
title: react-table Repository Graph Entry
type: text
description: >-
  Graph entry point for the react-table library, mapping it to consumer repos (xo.football data
  views), its task directory, and the canonical table-state schema.
base_uri: user:repository/active/react-table/ABOUT.md
created_at: '2026-05-13T18:02:40.823Z'
entity_id: 5e8cb2fe-45b5-4026-b7c7-ecbeb0d4a921
observations:
  - >-
    [gotcha] 2026-09-02 A column param has TWO arity fields and they are not interchangeable:
    `single` is SELECT-only, read by is_single_select at
    src/column-param-select-filter/column-param-select-filter.js:195-205 and modulated by
    enable_multi_on_split, while `is_single` is RANGE-only, read at
    src/column-param-range-filter/column-param-range-filter.js:114. Only the second changes stored
    SHAPE — store_value at src/utils/resolve-column-params.js:71-72 array-wraps every SELECT value
    regardless of `single` (confirmed: `year` is an array in 893 of 894 stored occurrences across
    113 saved-view columns, including on single:true columns), so a `single` divergence changes
    allowed LENGTH, whereas initialize_value at column-param-range-filter.js:127-131 returns a
    scalar when is_single is set and [min, max] when it is not. A research round conflated the two
    and prescribed `single` plus enable_multi_on_split for a RANGE param, which is incoherent —
    enable_multi_on_split is read only when `single` is truthy and plays no part in RANGE.
  - >-
    [gotcha] 2026-09-02 Nothing importing ParametersEditorItem is unit-testable: it pulls
    column-param-date-filter, which needs the uninstalled @mui/x-date-pickers peer dep, so mocha
    dies on MODULE_NOT_FOUND naming the date filter rather than the component under test. Extract
    presentational pieces to their own module to test them.
  - >-
    [decision] 2026-09-02 Arity must NOT be enforced uniformly in is_param_value_admissible: judge
    `is_single` and never `single`. An inadmissible value is overwritten with the default, not
    flagged, so repair is only safe where the verdict is permanent. `is_single` qualifies (static
    declaration property; initialize_value in column-param-range-filter.js returns a stored array
    unchanged since an array is non-null, so a scalar slider gets a pair and that shape reaches the
    server). `single` does not: enable_multi_on_split admits a list while a matching row axis is
    active, and table-row-axes-controls.js:188 writes row_axes without re-resolving params, so
    judging it means turning a split off and editing any sibling DESTROYS the stored list with no
    way back. Census over league's 193 saved views and 6,411 param instances: the `single` rule
    would reset 9 legitimate values across 5 views and repair 0.
public_read: false
relations:
  - follows [[user:guideline/directory-markdown-standards.md]]
tags:
  - user:tag/base-project.md
updated_at: '2026-09-02T02:53:18.140Z'
user_public_key: 10ba842b1307fd60475b887df61ccc7e697970a2d222e7cbf011e51f5de3349b
---

## Purpose

Reusable React table component library: filtering, sorting, column controls, virtualization, row axes, CSV/markdown export. Built on TanStack/react-table and Material-UI. Used by xo.football data views and other Base projects.

For public overview and install, see [[README.md]]. For agent-facing architecture, validators, and conventions, see [[CLAUDE.md]].

## Context

This is a shared component library, consumed by sibling repositories. Its table-state schema (`{ sort, columns, where, row_axes, prefix_columns, rank_aggregation }`) is the wire format for parameterized filtering and grouping across consuming apps. Changes to that schema have downstream consumers.

## Notable Context

**Consumers**:

- [[user:repository/active/league/ABOUT.md]] — xo.football data views are the primary consumer; data view persistence is documented at [[user:text/league/data-view-storage-architecture.md]]

**Tag**: [[user:tag/base-project.md]] — react-table is part of the broader base project ecosystem.

**Task directory**: [[user:task/react-table/]] — open work (data type additions like PERSONNEL_GROUP, save indicators, import aliases).

**Recent themes** (visible in task dir): adding new data types, unsaved-edit indicators, `#src/*` import aliases. Schema/data-type additions need coordinated updates in consuming repos.

**Governing guidelines**:

- [[user:guideline/directory-markdown-standards.md]] — structure for this file
- [[user:guideline/write-documentation.md]] — content quality standards

## Scope

**Belongs in this repo**: table components, filter/column/row-axes controls, validators, the data-type enumeration (`constants.mjs`), build config.

**Belongs elsewhere**:

- Consumer-specific column definitions, data sources, persistence → consuming app (e.g., `repository/active/league/`)
- Server-side query construction from the `where` clause → consumer's backend
- Data view storage architecture and migration → [[user:text/league/data-view-storage-architecture.md]]
