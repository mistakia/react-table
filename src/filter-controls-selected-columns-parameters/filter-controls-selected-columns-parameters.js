import React, { useContext, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import Popper from '@mui/material/Popper'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

import ParametersEditor from '#src/parameters-editor'
import { resolve_column_params } from '#src/utils'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'
import { table_context } from '#src/table-context'

import './filter-controls-selected-columns-parameters.styl'

const build_records = (
  selected_where_indexes,
  local_table_state,
  set_local_table_state,
  all_columns
) =>
  selected_where_indexes
    .map((index) => {
      const where_entry = local_table_state.where?.[index]
      if (!where_entry) return null
      const current_params = where_entry.params || {}
      return {
        id: String(index),
        kind: 'where',
        column_id: where_entry.column_id,
        get_value: (param_name) => current_params[param_name],
        // The whole param set, so a control can resolve which values its
        // SIBLINGS currently admit rather than offering the context-free list.
        get_params: () => current_params,
        update: (param_name, value) =>
          set_local_table_state((prev) => ({
            ...prev,
            where: prev.where.map((row, i) => {
              if (i !== index) return row
              // Same sibling re-resolution the column editor runs; a filter
              // holding an unreachable param value matches nothing and reads
              // as the data being empty.
              const { params: next_params } = resolve_column_params({
                column_params: all_columns?.[row.column_id]?.column_params,
                params: { ...(row.params || {}), [param_name]: value },
                data_type_select: TABLE_DATA_TYPES.SELECT,
                fill_unset: false
              })
              return {
                column_id: row.column_id,
                operator: row.operator,
                value: row.value,
                params: next_params
              }
            })
          }))
      }
    })
    .filter(Boolean)

export default function FilterControlsSelectedColumnsParameters({
  local_table_state,
  set_local_table_state,
  selected_where_indexes,
  local_table_state_where_columns
}) {
  const [visible, set_visible] = useState(false)
  const anchor_ref = useRef(null)
  const { all_columns } = useContext(table_context)

  const total_params_count = useMemo(() => {
    const names = new Set()
    for (const index of selected_where_indexes) {
      const column = local_table_state_where_columns[index]
      for (const name of Object.keys(column?.column_params || {})) {
        names.add(name)
      }
    }
    return names.size
  }, [selected_where_indexes, local_table_state_where_columns])

  const records = useMemo(
    () =>
      build_records(
        selected_where_indexes,
        local_table_state,
        set_local_table_state,
        all_columns
      ),
    [
      selected_where_indexes,
      local_table_state.where,
      set_local_table_state,
      all_columns
    ]
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
                Set parameters for {selected_where_indexes.length} selected
                {selected_where_indexes.length === 1 ? ' filter' : ' filters'}
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

FilterControlsSelectedColumnsParameters.propTypes = {
  local_table_state: PropTypes.object.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  selected_where_indexes: PropTypes.array.isRequired,
  local_table_state_where_columns: PropTypes.array.isRequired
}
