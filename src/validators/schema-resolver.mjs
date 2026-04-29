import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Bundled schemas for browser compatibility
const SCATTER_PLOT_OPTIONS_SCHEMA_ID =
  'https://mistakia.github.io/react-table/schema/state/scatter-plot-options.json'

const SCHEMAS = {
  'scatter-plot-options': {
    $id: SCATTER_PLOT_OPTIONS_SCHEMA_ID,
    type: 'object',
    additionalProperties: false,
    properties: {
      show_tier_grid: { type: 'boolean', default: false },
      show_x_mean_line: { type: 'boolean', default: true },
      show_y_mean_line: { type: 'boolean', default: true },
      point_color_mode: { type: 'string', enum: ['team', 'position'] },
      reference_lines: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            axis: { type: 'string', enum: ['x', 'y'] },
            value: { type: 'number' },
            label: { type: 'string', maxLength: 200 },
            color: {
              type: 'string',
              pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
            }
          },
          required: ['axis', 'value']
        }
      },
      custom_title: { type: ['string', 'null'], maxLength: 200 },
      custom_subtitle: { type: ['string', 'null'], maxLength: 1000 },
      font_family: { type: ['string', 'null'], maxLength: 100 }
    }
  },
  'table-operators': {
    $id: 'https://mistakia.github.io/react-table/schema/base/table-operators.json',
    type: 'string',
    enum: [
      '=',
      '!=',
      '>',
      '>=',
      '<',
      '<=',
      'LIKE',
      'NOT LIKE',
      'ILIKE',
      'NOT ILIKE',
      'IN',
      'NOT IN',
      'IS NULL',
      'IS NOT NULL'
    ]
  },
  'sort-item': {
    $id: 'https://mistakia.github.io/react-table/schema/state/sort-item.json',
    type: 'object',
    properties: {
      column_id: { type: 'string', minLength: 1, maxLength: 255 },
      desc: { type: 'boolean', default: false },
      column_index: { type: 'integer', minimum: 0, default: 0 }
    },
    required: ['column_id', 'desc']
  },
  'where-item': {
    $id: 'https://mistakia.github.io/react-table/schema/state/where-item.json',
    type: 'object',
    properties: {
      column_id: { type: 'string', minLength: 1, maxLength: 255 },
      column_name: { type: 'string', minLength: 1, maxLength: 255 },
      operator: {
        $ref: 'https://mistakia.github.io/react-table/schema/base/table-operators.json'
      },
      value: {},
      params: { type: 'object' },
      id: { type: 'string' },
      column_index: { type: 'integer', minimum: 0, default: 0 }
    },
    required: ['column_id', 'operator']
  },
  'column-reference': {
    $id: 'https://mistakia.github.io/react-table/schema/state/column-reference.json',
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
  },
  'table-state': {
    $id: 'https://mistakia.github.io/react-table/schema/state/table-state.json',
    type: 'object',
    properties: {
      sort: {
        type: 'array',
        items: {
          $ref: 'https://mistakia.github.io/react-table/schema/state/sort-item.json'
        }
      },
      columns: {
        type: 'array',
        items: {
          $ref: 'https://mistakia.github.io/react-table/schema/state/column-reference.json'
        }
      },
      prefix_columns: {
        type: 'array',
        items: {
          $ref: 'https://mistakia.github.io/react-table/schema/state/column-reference.json'
        }
      },
      where: {
        type: 'array',
        items: {
          $ref: 'https://mistakia.github.io/react-table/schema/state/where-item.json'
        }
      },
      splits: {
        type: 'array',
        items: { type: 'string' }
      },
      rank_aggregation: { type: 'object' },
      disable_scatter_plot: { type: 'boolean' },
      disable_column_controls: { type: 'boolean' },
      disable_multi_sort: { type: 'boolean' },
      scatter_plot_options: {
        $ref: SCATTER_PLOT_OPTIONS_SCHEMA_ID
      }
    }
  }
}

class ReactTableSchemaResolver {
  constructor() {
    this.ajv_instance = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    })

    addFormats(this.ajv_instance)
    this.compiled_validators = new Map()
    this.schemas_loaded = false
  }

  load_all_schemas() {
    if (this.schemas_loaded) return

    for (const schema of Object.values(SCHEMAS)) {
      if (schema.$id && !this.ajv_instance.getSchema(schema.$id)) {
        this.ajv_instance.addSchema(schema)
      }
    }

    this.schemas_loaded = true
  }

  get_schema(schema_name) {
    return SCHEMAS[schema_name]
  }

  compile_schema_validator(schema_id) {
    if (this.compiled_validators.has(schema_id)) {
      return this.compiled_validators.get(schema_id)
    }

    this.load_all_schemas()

    const validator = this.ajv_instance.compile({ $ref: schema_id })
    this.compiled_validators.set(schema_id, validator)
    return validator
  }

  get_ajv_instance() {
    return this.ajv_instance
  }

  clear_cache() {
    this.compiled_validators.clear()
  }
}

const schema_resolver_instance = new ReactTableSchemaResolver()

export { ReactTableSchemaResolver, schema_resolver_instance, SCHEMAS }
export default schema_resolver_instance
