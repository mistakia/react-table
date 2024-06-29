export const MENU_CLOSE_TIMEOUT = 300

export const TABLE_DATA_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  JSON: 3,
  BOOLEAN: 4,
  DATE: 5,
  BINARY_UUID: 6,
  SELECT: 7,
  RANGE: 8
}

export const TABLE_OPERATORS = {
  EQUAL: '=',
  NOT_EQUAL: '!=',
  GREATER_THAN: '>',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN: '<',
  LESS_THAN_OR_EQUAL: '<=',
  LIKE: 'LIKE',
  NOT_LIKE: 'NOT LIKE',
  IN: 'IN',
  NOT_IN: 'NOT IN',
  IS_NULL: 'IS NULL',
  IS_NOT_NULL: 'IS NOT NULL'
}

export const OPERATOR_MENU_DEFAULT_VALUE = TABLE_OPERATORS.EQUAL
export const OPERATOR_MENU_OPTIONS = [
  { value: TABLE_OPERATORS.EQUAL, label: 'Equal to' },
  { value: TABLE_OPERATORS.NOT_EQUAL, label: 'Not equal to' },
  { value: TABLE_OPERATORS.GREATER_THAN, label: 'Greater than' },
  {
    value: TABLE_OPERATORS.GREATER_THAN_OR_EQUAL,
    label: 'Greater than or equal'
  },
  { value: TABLE_OPERATORS.LESS_THAN, label: 'Less than' },
  { value: TABLE_OPERATORS.LESS_THAN_OR_EQUAL, label: 'Less than or equal' },
  { value: TABLE_OPERATORS.LIKE, label: 'Like' },
  { value: TABLE_OPERATORS.NOT_LIKE, label: 'Not like' },
  { value: TABLE_OPERATORS.IN, label: 'In' },
  { value: TABLE_OPERATORS.NOT_IN, label: 'Not in' },
  { value: TABLE_OPERATORS.IS_NULL, label: 'Is empty' },
  { value: TABLE_OPERATORS.IS_NOT_NULL, label: 'Is not empty' }
]

export const DATA_TYPE_OPERATORS = {
  [TABLE_DATA_TYPES.NUMBER]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.GREATER_THAN,
    TABLE_OPERATORS.GREATER_THAN_OR_EQUAL,
    TABLE_OPERATORS.LESS_THAN,
    TABLE_OPERATORS.LESS_THAN_OR_EQUAL,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.TEXT]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.LIKE,
    TABLE_OPERATORS.NOT_LIKE,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.JSON]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.BOOLEAN]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.DATE]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.GREATER_THAN,
    TABLE_OPERATORS.GREATER_THAN_OR_EQUAL,
    TABLE_OPERATORS.LESS_THAN,
    TABLE_OPERATORS.LESS_THAN_OR_EQUAL,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.BINARY_UUID]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ],
  [TABLE_DATA_TYPES.SELECT]: [
    TABLE_OPERATORS.EQUAL,
    TABLE_OPERATORS.NOT_EQUAL,
    TABLE_OPERATORS.IN,
    TABLE_OPERATORS.NOT_IN,
    TABLE_OPERATORS.IS_NULL,
    TABLE_OPERATORS.IS_NOT_NULL
  ]
}

export const DATA_TYPE_DEFAULT_OPERATORS = {
  [TABLE_DATA_TYPES.NUMBER]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.TEXT]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.JSON]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.BOOLEAN]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.DATE]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.BINARY_UUID]: TABLE_OPERATORS.EQUAL,
  [TABLE_DATA_TYPES.SELECT]: TABLE_OPERATORS.EQUAL
}

export const get_data_type = (column_data_type) => {
  switch (column_data_type) {
    case 'integer':
    case 'int':
    case 'bigint':
    case 'numeric':
    case 'real':
    case 'double precision':
    case 'smallint':
    case 'smallserial':
    case 'serial':
    case 'bigserial':
      return TABLE_DATA_TYPES.NUMBER

    case 'character varying':
    case 'text':
    case 'varchar':
      return TABLE_DATA_TYPES.TEXT

    case 'json':
      return TABLE_DATA_TYPES.JSON

    case 'boolean':
      return TABLE_DATA_TYPES.BOOLEAN

    case 'date':
    case 'timestamp':
    case 'datetime':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
      return TABLE_DATA_TYPES.DATE

    case 'binary':
      return TABLE_DATA_TYPES.BINARY_UUID

    default:
      console.log('Unknown data type: ' + column_data_type)
      return null
  }
}
