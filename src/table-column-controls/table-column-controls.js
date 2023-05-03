import React from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Modal from '@mui/material/Modal'
import IconButton from '@mui/material/IconButton'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable'
import { DndContext, PointerSensor, useSensors, useSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import DragHandleIcon from '@mui/icons-material/DragHandle'

import DataTypeIcon from '../data-type-icon'
import { fuzzy_match } from '../utils'

import './table-column-controls.styl'

function SortableItem({ column, set_column_hidden, filter_text_input }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: column.accessorKey
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const drag_disabled = !filter_text_input

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className='column-item'>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>{column.header_label}</div>
        <IconButton
          className='column-action'
          onClick={() => set_column_hidden(column.accessorKey)}>
          <VisibilityOffIcon />
        </IconButton>
        {drag_disabled && (
          <div className='column-drag-handle' {...listeners}>
            <DragHandleIcon />
          </div>
        )}
      </div>
    </div>
  )
}

SortableItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_hidden: PropTypes.func.isRequired,
  filter_text_input: PropTypes.string.isRequired
}

export default function TableColumnControls({
  table_state,
  all_columns = [],
  set_column_visible,
  set_column_hidden,
  set_all_columns_hidden,
  column_controls_popper_open,
  set_column_controls_popper_open,
  on_table_state_change
}) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [filter_text_input, set_filter_text_input] = React.useState('')
  const [hidden_column_items, set_hidden_column_items] = React.useState(
    all_columns.filter(
      (column) =>
        !(table_state.columns || []).find(
          (c) => c.accessorKey === column.column_name
        )
    )
  )
  const [shown_column_items, set_shown_column_items] = React.useState(
    (table_state.columns || []).map((column) => ({
      ...column,
      id: column.accessorKey
    }))
  )

  React.useEffect(() => {
    set_hidden_column_items(
      all_columns.filter(
        (column) =>
          !(table_state.columns || []).find(
            (c) => c.accessorKey === column.column_name
          )
      )
    )
    set_shown_column_items(
      (table_state.columns || []).map((column) => ({
        ...column,
        id: column.accessorKey
      }))
    )
  }, [all_columns, table_state.columns])

  const handle_filter_change = (event) => {
    set_filter_text_input(event.target.value)

    const shown_columns_index = {}
    const shown_items = []
    const hidden_items = []

    for (const column of table_state.columns || []) {
      if (
        filter_text_input &&
        !fuzzy_match(filter_text_input, column.accessorKey)
      ) {
        continue
      }

      shown_columns_index[column.accessorKey] = true
      shown_items.push({
        ...column,
        id: column.accessorKey
      })
    }

    for (const column of all_columns) {
      if (shown_columns_index[column.column_name]) continue

      if (
        filter_text_input &&
        !fuzzy_match(filter_text_input, column.accessorKey)
      ) {
        continue
      }

      hidden_items.push(column)
    }

    set_shown_column_items(shown_items)
    set_hidden_column_items(hidden_items)
  }

  const hidden_column_elements = []
  for (const column of hidden_column_items) {
    hidden_column_elements.push(
      <div key={column.column_name} className='column-item'>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>{column.column_name}</div>
        <IconButton
          className='column-action'
          onClick={() => set_column_visible(column)}>
          <VisibilityIcon />
        </IconButton>
      </div>
    )
  }

  const handle_on_close = () => {
    set_column_controls_popper_open(false)
    set_filter_text_input('')
  }

  const handle_drag_end = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const old_index = shown_column_items.findIndex(
        (column) => column.id === active.id
      )
      const new_index = shown_column_items.findIndex(
        (column) => column.id === over.id
      )

      set_shown_column_items(
        arrayMove(shown_column_items, old_index, new_index)
      )
      const new_columns = arrayMove(table_state.columns, old_index, new_index)
      on_table_state_change({
        ...table_state,
        columns: new_columns
      })
    }
  }

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={() =>
          set_column_controls_popper_open(!column_controls_popper_open)
        }>
        <ViewColumnIcon />
        Columns
      </Button>
      <Modal
        open={column_controls_popper_open}
        onClose={handle_on_close}
        placement='bottom'>
        <div className='table-column-controls'>
          <div className='filter-input'>
            <TextField
              id='outlined-basic'
              label='Filter columns'
              placeholder='Search for a column'
              variant='outlined'
              size='small'
              value={filter_text_input}
              onChange={handle_filter_change}
              fullWidth
              autoFocus
            />
          </div>
          <div className='section-header'>
            <div style={{ display: 'flex', alignSelf: 'center' }}>
              Shown in table
            </div>
            <div>
              <div className='action' onClick={() => set_all_columns_hidden()}>
                Hide all
              </div>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handle_drag_end}>
            <SortableContext items={shown_column_items}>
              {shown_column_items.map((column) => (
                <SortableItem
                  key={column.accessorKey}
                  {...{
                    column,
                    set_column_hidden,
                    filter_text_input
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className='section-header'>
            <div style={{ display: 'flex', alignSelf: 'center' }}>
              Hidden in table
            </div>
          </div>
          {hidden_column_elements}
        </div>
      </Modal>
    </>
  )
}

TableColumnControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  all_columns: PropTypes.array,
  set_column_visible: PropTypes.func,
  set_column_hidden: PropTypes.func,
  set_all_columns_hidden: PropTypes.func,
  column_controls_popper_open: PropTypes.bool,
  set_column_controls_popper_open: PropTypes.func,
  on_table_state_change: PropTypes.func
}
