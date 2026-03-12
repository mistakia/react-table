import React, { useMemo, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'

import ColumnControlsColumnParamItem from '../column-controls-column-param-item'
import { fuzzy_match, group_parameters } from '../utils'

import './column-controls-rate-type-denominator-params.styl'

// Must match NON_PLAY_LEVEL_RATE_TYPES in libs-shared/is-play-level-rate-type.mjs
const NON_PLAY_LEVEL_RATE_TYPES = new Set([
  'per_game',
  'per_team_half',
  'per_team_quarter'
])

// Must match NON_PLAY_LEVEL_GROUPS in libs-shared/get-rate-type-denominator-params.mjs
const NON_PLAY_LEVEL_GROUPS = new Set([
  'Weather',
  'Game',
  'Betting Markets',
  'Pace',
  'Play Timeout'
])

// Must match TIME_SCOPE_PARAM_KEYS in libs-shared/get-rate-type-denominator-params.mjs
const TIME_SCOPE_PARAM_KEYS = new Set([
  'year',
  'year_offset',
  'week',
  'week_offset',
  'seas_type',
  'career_year',
  'career_game'
])

const META_PARAM_KEYS = new Set([
  'rate_type',
  'rate_type_match_column_params',
  'rate_type_column_params'
])

function is_play_level_param(param_name, param_definition) {
  if (TIME_SCOPE_PARAM_KEYS.has(param_name)) return false
  if (META_PARAM_KEYS.has(param_name)) return false

  const groups = param_definition.groups || []
  if (
    groups.length > 0 &&
    groups.every((g) => NON_PLAY_LEVEL_GROUPS.has(g))
  ) {
    return false
  }

  return true
}

const ColumnControlsRateTypeDenominatorParams = ({
  column,
  set_local_table_state,
  column_index,
  splits
}) => {
  const [filter_text, set_filter_text] = useState('')

  const rate_type_value = column.selected_params?.rate_type
  const is_play_level =
    Boolean(rate_type_value) && !NON_PLAY_LEVEL_RATE_TYPES.has(rate_type_value)

  const match_column_params =
    column.selected_params?.rate_type_match_column_params
  const is_match_enabled = match_column_params === true

  const play_level_params = useMemo(() => {
    if (!column.column_params) return {}
    const result = {}
    for (const [name, definition] of Object.entries(column.column_params)) {
      if (is_play_level_param(name, definition)) {
        result[name] = definition
      }
    }
    return result
  }, [column.column_params])

  const filtered_params = useMemo(() => {
    const entries = Object.entries(play_level_params)
    if (!filter_text) return entries
    return entries.filter(([param_name]) =>
      fuzzy_match(filter_text, param_name)
    )
  }, [play_level_params, filter_text])

  const grouped_params = useMemo(() => {
    return group_parameters(Object.fromEntries(filtered_params))
  }, [filtered_params])

  // Create a virtual column whose selected_params is rate_type_column_params
  // so ColumnControlsColumnParamItem reads/writes the correct values
  const denominator_column = useMemo(() => {
    return {
      ...column,
      selected_params: column.selected_params?.rate_type_column_params || {}
    }
  }, [column])

  // Intercept set_local_table_state calls from ColumnControlsColumnParamItem
  // and redirect param updates into rate_type_column_params
  const handle_denominator_state_change = useCallback(
    (updater) => {
      set_local_table_state((prev_state) => {
        const next_state =
          typeof updater === 'function' ? updater(prev_state) : updater
        // Find the column that was updated by the param item
        const updated_column = next_state.columns[column_index]
        // The param item wrote directly to params - redirect into rate_type_column_params
        const current_column = prev_state.columns[column_index]
        const current_params =
          typeof current_column === 'string'
            ? {}
            : current_column.params || {}

        return {
          ...prev_state,
          columns: [
            ...prev_state.columns.slice(0, column_index),
            {
              column_id: updated_column.column_id,
              params: {
                ...current_params,
                rate_type_column_params: updated_column.params || {}
              }
            },
            ...prev_state.columns.slice(column_index + 1)
          ]
        }
      })
    },
    [set_local_table_state, column_index]
  )

  if (!is_play_level) return null

  const handle_toggle_change = (event) => {
    const new_value = event.target.checked
    const new_column = {
      column_id: column.column_id,
      params: {
        ...column.selected_params,
        rate_type_match_column_params: new_value
      }
    }
    set_local_table_state((prev_state) => ({
      ...prev_state,
      columns: [
        ...prev_state.columns.slice(0, column_index),
        new_column,
        ...prev_state.columns.slice(column_index + 1)
      ]
    }))
  }

  return (
    <div className='denominator-params-container'>
      <div className='denominator-params-header'>
        <div className='denominator-params-title'>Denominator Parameters</div>
        <Switch
          size='small'
          checked={is_match_enabled}
          onChange={handle_toggle_change}
        />
      </div>
      {is_match_enabled ? (
        <div className='denominator-params-status'>
          Denominator inherits numerator parameters
        </div>
      ) : (
        <>
          <TextField
            variant='outlined'
            margin='normal'
            fullWidth
            label='Search denominator parameters'
            size='small'
            autoComplete='off'
            value={filter_text}
            onChange={(e) => set_filter_text(e.target.value)}
          />
          {Object.entries(grouped_params).map(([group_name, params]) => (
            <div key={group_name} className='column-param-group'>
              {group_name !== 'Ungrouped' && (
                <div className='column-param-group-title'>{group_name}</div>
              )}
              {params.map(
                ([column_param_name, column_param_definition]) => (
                  <ColumnControlsColumnParamItem
                    key={column_param_name}
                    column={denominator_column}
                    set_local_table_state={handle_denominator_state_change}
                    column_index={column_index}
                    column_param_name={column_param_name}
                    column_param_definition={column_param_definition}
                    splits={splits}
                  />
                )
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

ColumnControlsRateTypeDenominatorParams.displayName =
  'ColumnControlsRateTypeDenominatorParams'
ColumnControlsRateTypeDenominatorParams.propTypes = {
  column: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  splits: PropTypes.array
}

export default React.memo(ColumnControlsRateTypeDenominatorParams)
