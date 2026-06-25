import React, { useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import ParametersEditor from '#src/parameters-editor'

import './column-controls-selected-columns-parameters.styl'

const build_records = (
  selected_column_indexes,
  local_table_state,
  set_local_table_state
) =>
  selected_column_indexes
    .map((index) => {
      const entry = local_table_state.columns?.[index]
      if (entry === undefined) return null
      const column_id = typeof entry === 'string' ? entry : entry.column_id
      const current_params = typeof entry === 'string' ? {} : entry.params || {}
      return {
        id: String(index),
        kind: 'column',
        column_id,
        get_value: (param_name) => current_params[param_name],
        update: (param_name, value) =>
          set_local_table_state((prev) => ({
            ...prev,
            columns: prev.columns.map((column, i) => {
              if (i !== index) return column
              const cur_id =
                typeof column === 'string' ? column : column.column_id
              const cur_params =
                typeof column === 'string' ? {} : column.params || {}
              return {
                column_id: cur_id,
                params: { ...cur_params, [param_name]: value }
              }
            })
          }))
      }
    })
    .filter(Boolean)

export default function ColumnControlsSelectedColumnsParameters({
  selected_column_indexes,
  local_table_state_columns,
  local_table_state,
  set_local_table_state
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)

  const total_params_count = useMemo(() => {
    const names = new Set()
    for (const index of selected_column_indexes) {
      const column = local_table_state_columns[index]
      for (const name of Object.keys(column?.column_params || {})) {
        names.add(name)
      }
    }
    return names.size
  }, [selected_column_indexes, local_table_state_columns])

  const records = useMemo(
    () =>
      build_records(
        selected_column_indexes,
        local_table_state,
        set_local_table_state
      ),
    [selected_column_indexes, local_table_state.columns, set_local_table_state]
  )

  if (total_params_count === 0) return null

  return (
    <ClickAwayListener onClickAway={() => set_visible(false)}>
      <div>
        <div
          className='action'
          onClick={() => set_visible(!visible)}
          ref={anchor_ref}>
          Set {total_params_count} Parameters
        </div>
        <Popper
          className='table-popper'
          open={visible}
          anchorEl={anchor_ref.current}>
          <div className='selected-columns-parameters rt-popper-surface'>
            <div className='selected-columns-parameters-header'>
              <div>
                Set parameters for {selected_column_indexes.length} selected
                {selected_column_indexes.length === 1 ? ' column' : ' columns'}
              </div>
            </div>
            <ParametersEditor
              records={records}
              row_axes={local_table_state.row_axes}
              show_sections
            />
          </div>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}

ColumnControlsSelectedColumnsParameters.propTypes = {
  selected_column_indexes: PropTypes.array.isRequired,
  local_table_state_columns: PropTypes.array.isRequired,
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired
}
