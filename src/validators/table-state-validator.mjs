import schema_resolver_instance from './schema-resolver.mjs'
import {
  add_security_keywords,
  SECURE_WHERE_VALUE_SCHEMA,
  SECURE_OPERATOR_SCHEMA,
  validate_where_clause_value_security,
  get_where_clause_security_errors
} from './security-patterns.mjs'

const NULL_OPERATORS = ['IS NULL', 'IS NOT NULL']
const ARRAY_OPERATORS = ['IN', 'NOT IN']
const COMPARISON_OPERATORS = ['=', '!=', '>', '>=', '<', '<=']
const STRING_OPERATORS = ['LIKE', 'NOT LIKE', 'ILIKE', 'NOT ILIKE']

class TableStateValidator {
  constructor() {
    this.schema_resolver = schema_resolver_instance
    this.ajv_instance = this.schema_resolver.get_ajv_instance()
    this.validator = null
    this.where_validator = null
    this.sort_validator = null
    this.columns_validator = null
    this.initialized = false

    add_security_keywords(this.ajv_instance)
  }

  initialize() {
    if (this.initialized) return

    this.schema_resolver.load_all_schemas()

    this.validator = this.schema_resolver.compile_schema_validator(
      'https://mistakia.github.io/react-table/schema/state/table-state.json'
    )

    this.where_validator = this.ajv_instance.compile({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          column_id: { type: 'string', minLength: 1, maxLength: 255 },
          column_name: { type: 'string', minLength: 1, maxLength: 255 },
          operator: SECURE_OPERATOR_SCHEMA,
          value: SECURE_WHERE_VALUE_SCHEMA,
          params: { type: 'object' },
          id: { type: 'string' },
          column_index: { type: 'integer', minimum: 0, default: 0 }
        },
        required: ['column_id', 'operator']
      }
    })

    this.sort_validator = this.ajv_instance.compile({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          column_id: { type: 'string', minLength: 1, maxLength: 255 },
          desc: { type: 'boolean', default: false }
        },
        required: ['column_id']
      }
    })

    this.columns_validator = this.ajv_instance.compile({
      type: 'array',
      items: {
        oneOf: [
          { type: 'string', minLength: 1, maxLength: 255 },
          {
            type: 'object',
            properties: {
              column_id: { type: 'string', minLength: 1, maxLength: 255 },
              params: { type: 'object' }
            },
            required: ['column_id']
          }
        ]
      }
    })

    this.initialized = true
  }

  validate_table_state(table_state) {
    this.initialize()

    const result = { valid: true, errors: [] }

    const is_valid = this.validator(table_state)
    if (!is_valid) {
      result.valid = false
      result.errors.push(...this.format_ajv_errors(this.validator.errors))
    }

    if (table_state.where) {
      const security_result = this.validate_where_security(table_state.where)
      if (!security_result.valid) {
        result.valid = false
        result.errors.push(...security_result.errors)
      }

      const compat_result = this.validate_operator_value_compatibility(
        table_state.where
      )
      if (!compat_result.valid) {
        result.valid = false
        result.errors.push(...compat_result.errors)
      }
    }

    return result
  }

  validate_where_security(where_clause) {
    const result = { valid: true, errors: [] }

    if (!Array.isArray(where_clause)) {
      result.valid = false
      result.errors.push('Where clause must be an array')
      return result
    }

    for (let i = 0; i < where_clause.length; i++) {
      const item = where_clause[i]

      if (item.value !== undefined && item.value !== null) {
        if (!validate_where_clause_value_security(item.value)) {
          const security_errors = get_where_clause_security_errors(item.value)
          result.valid = false
          result.errors.push(
            ...security_errors.map((e) => `where[${i}].value: ${e}`)
          )
        }
      }
    }

    return result
  }

  validate_operator_value_compatibility(where_clause) {
    const result = { valid: true, errors: [] }

    for (let i = 0; i < where_clause.length; i++) {
      const { operator, value } = where_clause[i]

      if (
        NULL_OPERATORS.includes(operator) &&
        value !== undefined &&
        value !== null
      ) {
        result.valid = false
        result.errors.push(`where[${i}]: ${operator} should not have a value`)
      }

      if (ARRAY_OPERATORS.includes(operator)) {
        if (!Array.isArray(value)) {
          result.valid = false
          result.errors.push(`where[${i}]: ${operator} requires an array value`)
        } else if (value.length === 0) {
          result.valid = false
          result.errors.push(
            `where[${i}]: ${operator} requires a non-empty array`
          )
        }
      }

      if (COMPARISON_OPERATORS.includes(operator) && Array.isArray(value)) {
        result.valid = false
        result.errors.push(
          `where[${i}]: ${operator} requires a single value, not an array`
        )
      }

      if (
        STRING_OPERATORS.includes(operator) &&
        typeof value !== 'string' &&
        value !== null &&
        value !== undefined
      ) {
        result.valid = false
        result.errors.push(`where[${i}]: ${operator} requires a string value`)
      }
    }

    return result
  }

  validate_component(component, data) {
    this.initialize()

    const result = { valid: true, errors: [] }

    let validator
    switch (component) {
      case 'where':
        validator = this.where_validator
        break
      case 'sort':
        validator = this.sort_validator
        break
      case 'columns':
        validator = this.columns_validator
        break
      default:
        result.valid = false
        result.errors.push(`Unknown component: ${component}`)
        return result
    }

    const is_valid = validator(data)
    if (!is_valid) {
      result.valid = false
      result.errors.push(...this.format_ajv_errors(validator.errors))
    }

    return result
  }

  format_ajv_errors(ajv_errors) {
    if (!ajv_errors) return []

    return ajv_errors.map((error) => {
      const path = error.instancePath || 'root'
      return `${path}: ${error.message}`
    })
  }

  get_validation_report(table_state) {
    const report = {
      overall: this.validate_table_state(table_state),
      components: {}
    }

    if (table_state.where) {
      report.components.where = this.validate_component(
        'where',
        table_state.where
      )
    }
    if (table_state.sort) {
      report.components.sort = this.validate_component('sort', table_state.sort)
    }
    if (table_state.columns) {
      report.components.columns = this.validate_component(
        'columns',
        table_state.columns
      )
    }

    return report
  }
}

const table_state_validator_instance = new TableStateValidator()

export { TableStateValidator, table_state_validator_instance }
export default table_state_validator_instance
