import React, { useMemo, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import FilterListIcon from '@mui/icons-material/FilterList'

import { get_string_from_object } from '#src/utils'
import DataTypeIcon from '#src/data-type-icon'
import ColumnPicker from '#src/column-picker'
import ParametersEditor from '#src/parameters-editor'

const ColumnControlsSelectedColumn = React.memo(
  ({
    all_columns,
    column,
    set_column_hidden_by_index,
    set_local_table_state,
    column_index,
    selected_column_indexes,
    set_selected_column_indexes,
    splits,
    bulk_edit_mode = false,
    has_active_where = false
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: `${column.column_id}-${column_index}`
    })

    const has_column_params = Boolean(column.column_params)
    const [show_column_params, set_show_column_params] = useState(false)
    const [column_select_open, set_column_select_open] = useState(false)
    const column_select_button_ref = useRef(null)

    const style = {
      position: 'relative',
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : null
    }

    const handle_column_select = (new_column) => {
      set_local_table_state((prev) => ({
        ...prev,
        columns: prev.columns.map((col, index) => {
          if (index !== column_index) return col
          if (typeof col === 'string') return new_column.column_id
          return {
            ...col,
            column_id: new_column.column_id,
            params: new_column.column_params
              ? Object.fromEntries(
                  Object.entries(col.params || {}).filter(
                    ([key]) => new_column.column_params[key]
                  )
                )
              : {}
          }
        })
      }))
      set_column_select_open(false)
    }

    const editor_records = useMemo(
      () => [
        {
          id: 'self',
          kind: 'column',
          column_id: column.column_id,
          column,
          column_index,
          set_local_table_state,
          get_value: (param_name) => column.selected_params?.[param_name],
          update: (param_name, value) =>
            set_local_table_state((prev) => ({
              ...prev,
              columns: [
                ...prev.columns.slice(0, column_index),
                {
                  column_id: column.column_id,
                  params: {
                    ...(column.selected_params || {}),
                    [param_name]: value
                  }
                },
                ...prev.columns.slice(column_index + 1)
              ]
            }))
        }
      ],
      [column, column_index, set_local_table_state]
    )

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          className={get_string_from_object({
            'column-item': true,
            reorder: true,
            'column-expanded': show_column_params,
            selected: selected_column_indexes.includes(column_index),
            'column-select-open': column_select_open
          })}>
          <div className='column-data-type'>
            <DataTypeIcon data_type={column.data_type} />
          </div>
          <div
            ref={column_select_button_ref}
            onClick={() => set_column_select_open(!column_select_open)}
            className='column-name'>
            {column.column_title || column.column_id}
            {has_active_where && (
              <Tooltip
                title='This column has an active filter'
                placement='top'
                enterDelay={700}
                enterNextDelay={300}>
                <FilterListIcon
                  className='column-name-funnel'
                  fontSize='inherit'
                />
              </Tooltip>
            )}
          </div>
          <ColumnPicker
            open={column_select_open}
            anchor_el={column_select_button_ref.current}
            all_columns={all_columns}
            on_select={handle_column_select}
            on_close={() => set_column_select_open(false)}
          />
          <div className='column-actions'>
            <Tooltip
              title={
                has_column_params
                  ? show_column_params
                    ? 'Hide parameters'
                    : 'Edit parameters'
                  : 'No parameters for this column'
              }
              placement='top'
              enterDelay={700}
              enterNextDelay={300}>
              <span className='column-item-slot'>
                <IconButton
                  size='small'
                  className='column-item-action'
                  disabled={!has_column_params}
                  onClick={() => set_show_column_params(!show_column_params)}>
                  {show_column_params ? (
                    <ExpandLessIcon fontSize='small' />
                  ) : (
                    <ExpandMoreIcon fontSize='small' />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title='Remove column'
              placement='top'
              enterDelay={700}
              enterNextDelay={300}>
              <span className='column-item-slot'>
                <IconButton
                  size='small'
                  className='column-item-action column-item-remove'
                  onClick={() => set_column_hidden_by_index(column_index)}>
                  <CloseIcon fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
            {bulk_edit_mode && (
              <Tooltip
                title='Select for bulk action'
                placement='top'
                enterDelay={700}
                enterNextDelay={300}>
                <span className='column-item-slot'>
                  <Checkbox
                    size='small'
                    className='column-item-bulk-checkbox'
                    checked={selected_column_indexes.includes(column_index)}
                    onChange={(event) => {
                      set_selected_column_indexes(
                        event.target.checked
                          ? [...selected_column_indexes, column_index]
                          : selected_column_indexes.filter(
                              (index) => index !== column_index
                            )
                      )
                    }}
                  />
                </span>
              </Tooltip>
            )}
            <Tooltip
              title='Drag to reorder'
              placement='top'
              enterDelay={700}
              enterNextDelay={300}>
              <div className='column-drag-handle' {...listeners}>
                <DragIndicatorIcon fontSize='small' />
              </div>
            </Tooltip>
          </div>
          {show_column_params && (
            <div className='column-params-container'>
              <ParametersEditor
                records={editor_records}
                splits={splits}
                inline
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

ColumnControlsSelectedColumn.displayName = 'ColumnControlsSelectedColumn'
ColumnControlsSelectedColumn.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_hidden_by_index: PropTypes.func.isRequired,
  set_local_table_state: PropTypes.func.isRequired,
  column_index: PropTypes.number.isRequired,
  selected_column_indexes: PropTypes.array.isRequired,
  set_selected_column_indexes: PropTypes.func.isRequired,
  splits: PropTypes.array,
  all_columns: PropTypes.array,
  bulk_edit_mode: PropTypes.bool,
  has_active_where: PropTypes.bool
}

export default ColumnControlsSelectedColumn
