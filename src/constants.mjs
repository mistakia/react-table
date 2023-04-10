export const TABLE_DATA_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  JSON: 3,
  BOOLEAN: 4,
  DATE: 5,
  BINARY_UUID: 6
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
