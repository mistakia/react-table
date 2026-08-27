import React, { useMemo, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'

import { fuzzy_match, group_parameters } from '#src/utils'

import './column-param-override-section.styl'

// The sibling-param override panel: a switch that forks a column's own params
// into a second set scoped to one param's computation (a rate denominator, for
// example), plus the editors for that second set.
//
// It is a standalone component rather than markup inside the select filter
// because a custom param `component` needs the same panel -- and every piece of
// it that could go wrong is a table-state write, which a consumer should not be
// reimplementing.
export default function ColumnParamOverrideSection({
  param_override_config,
  effective_value,
  column,
  column_index,
  set_local_table_state,
  row_axes = [],
  render_param_item
}) {
  const {
    label: override_label,
    toggle_param,
    override_param,
    disabled_values,
    overridable_param_filter
  } = param_override_config

  const [filter_text, set_filter_text] = useState('')

  const is_toggle_disabled = disabled_values.includes(effective_value)
  const is_toggle_on =
    column.selected_params?.[toggle_param] === true && !is_toggle_disabled

  const overridable_params = useMemo(() => {
    if (!column.column_params) return {}
    const { exclude_groups, exclude_param_names } = overridable_param_filter
    const result = {}
    for (const [name, definition] of Object.entries(column.column_params)) {
      if (exclude_param_names.includes(name)) continue
      if (definition.hidden) continue
      const groups = definition.groups || []
      if (
        groups.length > 0 &&
        groups.every((g) => exclude_groups.includes(g))
      ) {
        continue
      }
      result[name] = definition
    }
    return result
  }, [column.column_params, overridable_param_filter])

  const grouped_override_params = useMemo(() => {
    const entries = Object.entries(overridable_params)
    const filtered = filter_text
      ? entries.filter(([name]) => fuzzy_match(filter_text, name))
      : entries
    return group_parameters(Object.fromEntries(filtered))
  }, [overridable_params, filter_text])

  // A virtual column whose selected_params ARE the override set, so the param
  // editors below read and write the override values rather than the column's.
  const override_column = useMemo(
    () => ({
      ...column,
      selected_params: column.selected_params?.[override_param] || {}
    }),
    [column, override_param]
  )

  const handle_toggle_change = useCallback(
    (event) => {
      const new_toggle_value = event.target.checked
      const current_params = column.selected_params || {}

      const new_params = {
        ...current_params,
        [toggle_param]: new_toggle_value
      }

      if (new_toggle_value) {
        const inherited = {}
        for (const param_name of Object.keys(overridable_params)) {
          if (current_params[param_name] !== undefined) {
            inherited[param_name] = current_params[param_name]
          }
        }
        new_params[override_param] = inherited
      } else {
        delete new_params[override_param]
      }

      const new_column = { column_id: column.column_id, params: new_params }
      set_local_table_state((prev_state) => ({
        ...prev_state,
        columns: [
          ...prev_state.columns.slice(0, column_index),
          new_column,
          ...prev_state.columns.slice(column_index + 1)
        ]
      }))
    },
    [
      column,
      column_index,
      set_local_table_state,
      toggle_param,
      override_param,
      overridable_params
    ]
  )

  const handle_clear = useCallback(() => {
    const current_params = column.selected_params || {}
    const new_params = { ...current_params, [override_param]: {} }
    const new_column = { column_id: column.column_id, params: new_params }
    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: [
        ...prev_state.columns.slice(0, column_index),
        new_column,
        ...prev_state.columns.slice(column_index + 1)
      ]
    }))
  }, [column, column_index, set_local_table_state, override_param])

  // Param editors write to the column they were handed; this reroutes that
  // write into the override sub-object instead of over the column's own params.
  const handle_override_state_change = useCallback(
    (updater) => {
      set_local_table_state((prev_state) => {
        const next_state =
          typeof updater === 'function' ? updater(prev_state) : updater
        const updated_column = next_state.columns[column_index]
        const current_column = prev_state.columns[column_index]
        const current_params =
          typeof current_column === 'string' ? {} : current_column.params || {}

        return {
          ...prev_state,
          columns: [
            ...prev_state.columns.slice(0, column_index),
            {
              column_id: updated_column.column_id,
              params: {
                ...current_params,
                [override_param]: updated_column.params || {}
              }
            },
            ...prev_state.columns.slice(column_index + 1)
          ]
        }
      })
    },
    [set_local_table_state, column_index, override_param]
  )

  return (
    <div className='override-section'>
      <div className='override-header'>
        <div className='override-label'>{override_label}</div>
        {is_toggle_on && (
          <div className='controls-button' onClick={handle_clear}>
            Clear
          </div>
        )}
        <Switch
          size='small'
          checked={is_toggle_on}
          onChange={handle_toggle_change}
          disabled={is_toggle_disabled}
        />
      </div>
      {is_toggle_on && (
        <div className='override-params-body'>
          <div className='override-params-search'>
            <TextField
              variant='outlined'
              margin='none'
              fullWidth
              label='Search parameters'
              size='small'
              autoComplete='off'
              value={filter_text}
              onChange={(event) => set_filter_text(event.target.value)}
            />
          </div>
          <div className='override-params-container'>
            {Object.entries(grouped_override_params).map(
              ([group_name, params]) => (
                <div key={group_name} className='column-param-group'>
                  {group_name !== 'Ungrouped' && (
                    <div className='column-param-group-title'>{group_name}</div>
                  )}
                  {params.map(([column_param_name, column_param_definition]) =>
                    render_param_item({
                      key: column_param_name,
                      column: override_column,
                      set_local_table_state: handle_override_state_change,
                      column_index,
                      column_param_name,
                      column_param_definition,
                      row_axes
                    })
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

ColumnParamOverrideSection.displayName = 'ColumnParamOverrideSection'
ColumnParamOverrideSection.propTypes = {
  param_override_config: PropTypes.object.isRequired,
  effective_value: PropTypes.any,
  column: PropTypes.object.isRequired,
  column_index: PropTypes.number.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  row_axes: PropTypes.array,
  render_param_item: PropTypes.func.isRequired
}
