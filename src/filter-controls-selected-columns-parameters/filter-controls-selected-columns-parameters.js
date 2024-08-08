import React, { useState, useRef, useMemo, useEffect } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import TextField from '@mui/material/TextField'

import ColumnParamSelectFilter from '../column-param-select-filter'
import ColumnParamRangeFilter from '../column-param-range-filter'
import ColumnParamBooleanFilter from '../column-param-boolean-filter'
import { TABLE_DATA_TYPES } from '../constants.mjs'
import { fuzzy_match, group_parameters } from '../utils'

const SharedWhereParamItem = ({
  column_param_name,
  local_table_state,
  column_param_definition,
  selected_where_indexes,
  set_local_table_state,
  splits = []
}) => {
  if (column_param_definition?.enable_on_splits) {
    const is_enabled = splits.some((split) =>
      column_param_definition.enable_on_splits.includes(split)
    )
    if (!is_enabled) {
      return null
    }
  }

  if (column_param_definition?.disable_on_splits && splits.length) {
    return null
  }

  const { data_type } = column_param_definition

  const handle_change = (values) => {
    const where = local_table_state.where.map((column, index) => {
      if (selected_where_indexes.includes(index)) {
        const existing_params = column?.params || {}
        return {
          column_id: column.column_id,
          operator: column.operator,
          value: column.value,
          params: {
            ...existing_params,
            [column_param_name]: values
          }
        }
      }
      return column
    })

    set_local_table_state({
      ...local_table_state,
      where
    })
  }

  const { selected_param_values, is_equal } = useMemo(() => {
    const param_values = selected_where_indexes.map(
      (index) => local_table_state.where[index]?.params?.[column_param_name]
    )

    const is_equal = param_values.every(
      (value) => JSON.stringify(value) === JSON.stringify(param_values[0])
    )
    return {
      selected_param_values: is_equal ? param_values[0] : undefined,
      is_equal
    }
  }, [local_table_state, column_param_name, selected_where_indexes])

  const param_props = {
    column_param_name,
    column_param_definition,
    selected_param_values,
    handle_change,
    mixed_state: !is_equal
  }

  switch (data_type) {
    case TABLE_DATA_TYPES.SELECT:
      return <ColumnParamSelectFilter {...param_props} />
    case TABLE_DATA_TYPES.RANGE:
      return <ColumnParamRangeFilter {...param_props} />
    case TABLE_DATA_TYPES.BOOLEAN:
      return <ColumnParamBooleanFilter {...param_props} />
    default:
      return null
  }
}

SharedWhereParamItem.propTypes = {
  column_param_name: PropTypes.string.isRequired,
  local_table_state: PropTypes.object.isRequired,
  column_param_definition: PropTypes.object.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  splits: PropTypes.array.isRequired
}

export default function FilterControlsSelectedColumnsParameters({
  local_table_state,
  set_local_table_state,
  selected_where_indexes,
  local_table_state_where_columns
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)
  const [param_filter_text, set_param_filter_text] = useState('')
  const param_filter_input_ref = useRef(null)

  const { shared_parameters, all_parameters } = useMemo(() => {
    if (
      local_table_state_where_columns.length === 0 ||
      selected_where_indexes.length === 0
    ) {
      return {
        shared_parameters: {},
        all_parameters: {}
      }
    }

    const all_params = selected_where_indexes.map((index) => {
      const column = local_table_state_where_columns[index]
      return column && column.column_params
        ? Object.keys(column.column_params)
        : []
    })

    const shared_param_names = all_params.reduce((shared, params) =>
      shared.filter((param) => params.includes(param))
    )

    const all_param_names = [...new Set(all_params.flat())]
    const non_shared_param_names = all_param_names.filter(
      (param) => !shared_param_names.includes(param)
    )

    // Create an index of param definitions
    const param_definitions = {}
    selected_where_indexes.forEach((index) => {
      const column = local_table_state_where_columns[index]
      if (column && column.column_params) {
        Object.entries(column.column_params).forEach(
          ([param_name, definition]) => {
            if (!param_definitions[param_name]) {
              param_definitions[param_name] = definition
            }
          }
        )
      }
    })

    const create_param_object = (param_name, definition) => ({
      [param_name]: definition
    })

    return {
      shared_parameters: shared_param_names.reduce((acc, param_name) => {
        return {
          ...acc,
          ...create_param_object(param_name, param_definitions[param_name])
        }
      }, {}),
      all_parameters: non_shared_param_names.reduce((acc, param_name) => {
        return {
          ...acc,
          ...create_param_object(param_name, param_definitions[param_name])
        }
      }, {})
    }
  }, [selected_where_indexes, local_table_state_where_columns])

  const filtered_parameters = useMemo(() => {
    const filter_params = (params) => {
      if (!param_filter_text) {
        return group_parameters(params)
      }
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([column_param_name]) =>
          fuzzy_match(param_filter_text, column_param_name)
        )
      )
      return group_parameters(filtered)
    }

    return {
      shared: filter_params(shared_parameters),
      all: filter_params(all_parameters)
    }
  }, [param_filter_text, shared_parameters, all_parameters])

  useEffect(() => {
    if (visible && param_filter_input_ref.current) {
      param_filter_input_ref.current.focus()
    }
  }, [visible])

  const handle_param_filter_change = (event) => {
    set_param_filter_text(event.target.value)
  }

  const total_params_count =
    Object.keys(shared_parameters).length + Object.keys(all_parameters).length

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='action'
          onClick={() => set_visible(!visible)}
          ref={anchor_ref}>
          Set {total_params_count} Parameters
        </div>
        <Popper open={visible} anchorEl={anchor_ref.current}>
          <div className='selected-columns-parameters'>
            <div className='selected-columns-parameters-header'>
              <div>
                Set parameters for {selected_where_indexes.length} selected
                {selected_where_indexes.length === 1 ? ' filter' : ' filters'}
              </div>
              <div
                className='controls-button'
                onClick={() => set_visible(false)}>
                Close
              </div>
            </div>
            <div className='param-filter-container'>
              <TextField
                variant='outlined'
                margin='none'
                fullWidth
                id='param-filter'
                label='Search parameters'
                name='param_filter'
                size='small'
                autoComplete='off'
                value={param_filter_text}
                onChange={handle_param_filter_change}
                inputRef={param_filter_input_ref}
              />
            </div>
            <div className='selected-columns-parameters-body'>
              {Object.keys(shared_parameters).length > 0 && (
                <>
                  <div className='section-header'>Shared</div>
                  <div className='parameters-container'>
                    {Object.entries(filtered_parameters.shared).map(
                      ([group_name, params]) => (
                        <div key={group_name} className='column-param-group'>
                          {group_name !== 'Ungrouped' && (
                            <div className='column-param-group-title'>
                              {group_name}
                            </div>
                          )}
                          {params.map(
                            ([column_param_name, column_param_definition]) => (
                              <SharedWhereParamItem
                                key={column_param_name}
                                column_param_name={column_param_name}
                                local_table_state={local_table_state}
                                column_param_definition={
                                  column_param_definition
                                }
                                selected_where_indexes={selected_where_indexes}
                                set_local_table_state={set_local_table_state}
                                splits={local_table_state.splits}
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
              {Object.keys(all_parameters).length > 0 && (
                <>
                  <div className='section-header'>All</div>
                  <div className='parameters-container'>
                    {Object.entries(filtered_parameters.all).map(
                      ([group_name, params]) => (
                        <div key={group_name} className='column-param-group'>
                          {group_name !== 'Ungrouped' && (
                            <div className='column-param-group-title'>
                              {group_name}
                            </div>
                          )}
                          {params.map(
                            ([column_param_name, column_param_definition]) => (
                              <SharedWhereParamItem
                                key={column_param_name}
                                column_param_name={column_param_name}
                                local_table_state={local_table_state}
                                column_param_definition={
                                  column_param_definition
                                }
                                selected_where_indexes={selected_where_indexes}
                                set_local_table_state={set_local_table_state}
                                splits={local_table_state.splits}
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

FilterControlsSelectedColumnsParameters.propTypes = {
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  local_table_state_where_columns: PropTypes.array.isRequired
}
