---
title: react-table Repository Graph Entry
type: text
description: >-
  Graph entry point for the react-table library, mapping it to consumer repos (xo.football data
  views), its task directory, and the canonical table-state schema.
base_uri: user:repository/active/react-table/ABOUT.md
created_at: '2026-05-13T18:02:40.823Z'
entity_id: 5e8cb2fe-45b5-4026-b7c7-ecbeb0d4a921
public_read: false
relations:
  - follows [[user:guideline/directory-markdown-standards.md]]
tags:
  - user:tag/base-project.md
updated_at: '2026-05-13T18:02:40.823Z'
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
