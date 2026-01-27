# React Table Component

React table component using TanStack/react-table and Material-UI.

## Installation

```bash
npm install @mistakia/react-table
```

## Basic Usage

```javascript
import Table from '@mistakia/react-table'

const all_columns = {
  name: {
    column_id: 'name',
    header_label: 'Name',
    accessorKey: 'name',
    data_type: 2 // TEXT
  },
  age: {
    column_id: 'age',
    header_label: 'Age',
    accessorKey: 'age',
    data_type: 1 // NUMBER
  }
}

const table_state = {
  columns: ['name', 'age'],
  sort: [{ column_id: 'name', desc: false }],
  where: []
}

const data = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
]

function MyTable() {
  return (
    <Table data={data} all_columns={all_columns} table_state={table_state} />
  )
}
```

## Schema Documentation

Complete JSON Schema documentation is available in the [`schema/`](./schema/) directory:

- [`schema/index.json`](./schema/index.json) - Component props schema with examples
- [`schema/state/table-state.json`](./schema/state/table-state.json) - Table state configuration
- [`schema/columns/column-definition.json`](./schema/columns/column-definition.json) - Column definition schema
- [`schema/base/table-data-types.json`](./schema/base/table-data-types.json) - Data type constants
- [`schema/base/table-operators.json`](./schema/base/table-operators.json) - Filter operators

## Validation

Runtime validation for table state objects using AJV JSON Schema validation with security patterns.

```javascript
import { validate_table_state } from 'react-table'

const result = validate_table_state(table_state)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

### Security Patterns

Where clause values are validated to prevent SQL injection:

- Blocks dangerous SQL keywords: `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`, `MERGE`, `EXEC`
- Prevents SQL comment sequences and dangerous characters
- String length limits (max 200 characters) and array size limits (max 100 items)
- Only allows predefined safe operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`, `IS NULL`, `IS NOT NULL`, `IN`, `NOT IN`

### Design Decisions

- AJV chosen over fastest-validator for native JSON Schema `$ref` resolution
- Schemas bundled inline for browser compatibility
- Security validation runs separately from schema validation for detailed error reporting
- Enable `enable_validation_warnings` prop to log validation errors to console

## License

MIT
