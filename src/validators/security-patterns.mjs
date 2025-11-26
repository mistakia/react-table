/**
 * Security patterns for AJV validation to prevent SQL injection
 */

const SQL_INJECTION_PATTERN =
  /(\b(delete|drop|truncate|alter|update|insert|merge|exec)\b|--|;|\/\*|\*\/)/i

const SECURITY_LIMITS = {
  MAX_STRING_LENGTH: 200,
  MIN_STRING_LENGTH: 0,
  MAX_ARRAY_ITEMS: 100
}

const VALID_OPERATORS = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'ILIKE',
  'NOT ILIKE',
  'LIKE',
  'NOT LIKE',
  'IS NULL',
  'IS NOT NULL',
  'IN',
  'NOT IN'
]

export function add_security_keywords(ajv_instance) {
  ajv_instance.addKeyword({
    keyword: 'secureString',
    type: 'string',
    schemaType: 'boolean',
    compile: (schema_value) => {
      if (!schema_value) return () => true

      return function validate_secure_string(data) {
        if (SQL_INJECTION_PATTERN.test(data)) {
          validate_secure_string.errors = [
            {
              instancePath: '',
              schemaPath: '#/secureString',
              keyword: 'secureString',
              data,
              message:
                'String contains potentially unsafe SQL keywords or characters'
            }
          ]
          return false
        }

        if (data.length > SECURITY_LIMITS.MAX_STRING_LENGTH) {
          validate_secure_string.errors = [
            {
              instancePath: '',
              schemaPath: '#/secureString',
              keyword: 'secureString',
              data,
              message: `String exceeds max length of ${SECURITY_LIMITS.MAX_STRING_LENGTH}`
            }
          ]
          return false
        }

        return true
      }
    }
  })

  ajv_instance.addKeyword({
    keyword: 'secureArray',
    type: 'array',
    schemaType: 'boolean',
    compile: (schema_value) => {
      if (!schema_value) return () => true

      return function validate_secure_array(data) {
        if (data.length > SECURITY_LIMITS.MAX_ARRAY_ITEMS) {
          validate_secure_array.errors = [
            {
              instancePath: '',
              schemaPath: '#/secureArray',
              keyword: 'secureArray',
              data,
              message: `Array exceeds max length of ${SECURITY_LIMITS.MAX_ARRAY_ITEMS}`
            }
          ]
          return false
        }

        for (let i = 0; i < data.length; i++) {
          const item = data[i]
          if (typeof item === 'string') {
            if (SQL_INJECTION_PATTERN.test(item)) {
              validate_secure_array.errors = [
                {
                  instancePath: `/${i}`,
                  schemaPath: '#/secureArray',
                  keyword: 'secureArray',
                  data: item,
                  message: `Array item ${i} contains unsafe SQL keywords`
                }
              ]
              return false
            }

            if (item.length > SECURITY_LIMITS.MAX_STRING_LENGTH) {
              validate_secure_array.errors = [
                {
                  instancePath: `/${i}`,
                  schemaPath: '#/secureArray',
                  keyword: 'secureArray',
                  data: item,
                  message: `Array item ${i} exceeds max length`
                }
              ]
              return false
            }
          }
        }

        return true
      }
    }
  })

  ajv_instance.addKeyword({
    keyword: 'validOperator',
    type: 'string',
    schemaType: 'boolean',
    compile: (schema_value) => {
      if (!schema_value) return () => true

      return function validate_operator(data) {
        if (!VALID_OPERATORS.includes(data)) {
          validate_operator.errors = [
            {
              instancePath: '',
              schemaPath: '#/validOperator',
              keyword: 'validOperator',
              data,
              message: `Invalid operator. Must be one of: ${VALID_OPERATORS.join(', ')}`
            }
          ]
          return false
        }
        return true
      }
    }
  })
}

export const SECURE_WHERE_VALUE_SCHEMA = {
  oneOf: [
    {
      type: 'string',
      secureString: true,
      maxLength: SECURITY_LIMITS.MAX_STRING_LENGTH
    },
    { type: 'number' },
    {
      type: 'array',
      secureArray: true,
      maxItems: SECURITY_LIMITS.MAX_ARRAY_ITEMS,
      items: {
        oneOf: [
          {
            type: 'string',
            secureString: true,
            maxLength: SECURITY_LIMITS.MAX_STRING_LENGTH
          },
          { type: 'number' }
        ]
      }
    }
  ]
}

export const SECURE_OPERATOR_SCHEMA = {
  type: 'string',
  validOperator: true
}

export function validate_where_clause_value_security(value) {
  if (typeof value === 'string') {
    if (SQL_INJECTION_PATTERN.test(value)) {
      return false
    }
    if (value.length > SECURITY_LIMITS.MAX_STRING_LENGTH) {
      return false
    }
  } else if (Array.isArray(value)) {
    if (value.length > SECURITY_LIMITS.MAX_ARRAY_ITEMS) {
      return false
    }
    for (const item of value) {
      if (!validate_where_clause_value_security(item)) {
        return false
      }
    }
  } else if (typeof value !== 'number') {
    return false
  }

  return true
}

export function get_where_clause_security_errors(value) {
  const errors = []

  if (typeof value === 'string') {
    if (SQL_INJECTION_PATTERN.test(value)) {
      errors.push(
        'String contains potentially unsafe SQL keywords or characters'
      )
    }
    if (value.length > SECURITY_LIMITS.MAX_STRING_LENGTH) {
      errors.push(
        `String exceeds max length of ${SECURITY_LIMITS.MAX_STRING_LENGTH}`
      )
    }
  } else if (Array.isArray(value)) {
    if (value.length > SECURITY_LIMITS.MAX_ARRAY_ITEMS) {
      errors.push(
        `Array exceeds max length of ${SECURITY_LIMITS.MAX_ARRAY_ITEMS}`
      )
    }
    value.forEach((item, index) => {
      const item_errors = get_where_clause_security_errors(item)
      item_errors.forEach((error) => {
        errors.push(`Array item ${index}: ${error}`)
      })
    })
  } else if (
    typeof value !== 'number' &&
    value !== null &&
    value !== undefined
  ) {
    errors.push('Value must be string, number, or array')
  }

  return errors
}

export { SQL_INJECTION_PATTERN, SECURITY_LIMITS, VALID_OPERATORS }
