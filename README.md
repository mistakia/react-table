# React Table Component

React table component using TanStack/react-table and Material-UI.

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
