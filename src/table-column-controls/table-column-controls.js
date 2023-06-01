import React from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Modal from '@mui/material/Modal'
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable'
import { DndContext, PointerSensor, useSensors, useSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import TreeView from '@mui/lab/TreeView'
import TreeItem from '@mui/lab/TreeItem'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import DataTypeIcon from '../data-type-icon'
import {
  fuzzy_match,
  group_columns_into_tree_view,
  get_string_from_object
} from '../utils'

import './table-column-controls.styl'

const TableColumnItem = React.forwardRef(
  ({ column, set_column_visible, set_column_hidden, is_visible }, ref) => {
    return (
      <div
        ref={ref}
        className={get_string_from_object({
          'column-item': true,
          shown: is_visible
        })}>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>
          {column.column_title || column.column_id}
        </div>
        <Button
          size='small'
          className='column-action'
          onClick={() =>
            is_visible
              ? set_column_hidden(column.column_id)
              : set_column_visible(column.column_id)
          }>
          {is_visible ? 'Hide' : 'Show'}
        </Button>
      </div>
    )
  }
)

TableColumnItem.propTypes = {
  column: PropTypes.object.isRequired,
  set_column_visible: PropTypes.func.isRequired,
  set_column_hidden: PropTypes.func.isRequired,
  is_visible: PropTypes.bool
}
TableColumnItem.displayName = 'TableColumnItem'

const get_column_group_column_count = (columns) => {
  let count = 0
  columns.forEach((column) => {
    if (column.columns) {
      count += get_column_group_column_count(column.columns)
    } else {
      count += 1
    }
  })
  return count
}

function TreeColumnItem({
  item,
  item_path = '/',
  set_column_visible,
  set_column_hidden,
  shown_column_index = {}
}) {
  const sub_item_path = `${item_path}/${item.header || item.column_title}`

  if (!item.columns) {
    return (
      <TreeItem
        nodeId={sub_item_path}
        ContentComponent={TableColumnItem}
        ContentProps={{
          column: item,
          set_column_visible,
          set_column_hidden,
          is_visible: shown_column_index[item.column_id]
        }}
      />
    )
  }

  const sub_items = []
  if (item.columns && item.columns.length > 0) {
    item.columns.forEach((sub_item, index) => {
      sub_items.push(
        <TreeColumnItem
          key={index}
          item={sub_item}
          item_path={sub_item_path}
          {...{ set_column_visible, set_column_hidden, shown_column_index }}
        />
      )
    })
  }

  const label = (item.header || item.column_title).toLowerCase()
  const label_with_count = `${label} (${get_column_group_column_count(
    item.columns
  )})`

  return (
    <TreeItem nodeId={sub_item_path} label={label_with_count}>
      {sub_items}
    </TreeItem>
  )
}

TreeColumnItem.propTypes = {
  item: PropTypes.object.isRequired,
  item_path: PropTypes.string,
  set_column_visible: PropTypes.func.isRequired,
  set_column_hidden: PropTypes.func.isRequired,
  shown_column_index: PropTypes.object
}

function SortableItem({ column, set_column_hidden, filter_text_input }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: column.column_id
  })

  const is_drag_enabled = !filter_text_input

  const style = {
    position: 'relative',
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : null
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className='column-item reorder'>
        <div className='column-data-type'>
          <DataTypeIcon data_type={column.data_type} />
        </div>
        <div className='column-name'>
          {column.column_title || column.column_id}
        </div>
        <Button
          size='small'
          className='column-action'
          onClick={() => set_column_hidden(column.column_id)}>
          Hide
        </Button>
        {is_drag_enabled && (
          <div className='column-drag-handle' {...listeners}>
            <DragIndicatorIcon />
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
  table_state_columns = [],
  all_columns = [],
  set_column_visible,
  set_column_hidden,
  set_all_columns_hidden,
  column_controls_popper_open,
  set_column_controls_popper_open,
  on_table_state_change,
  prefix_columns = []
}) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [filter_text_input, set_filter_text_input] = React.useState('')
  const [shown_column_items, set_shown_column_items] = React.useState(
    (table_state_columns || []).map((column) => ({
      ...column,
      id: column.column_id
    }))
  )

  const shown_column_index = React.useMemo(() => {
    const index = {}

    for (const column of table_state_columns) {
      index[column.column_id] = true
    }

    return index
  }, [table_state_columns])

  const tree_view_columns = React.useMemo(() => {
    if (!filter_text_input) {
      return group_columns_into_tree_view(all_columns)
    }

    const filtered_columns = all_columns.filter((column) =>
      fuzzy_match(filter_text_input, column.column_title || column.column_id)
    )
    return group_columns_into_tree_view(filtered_columns)
  }, [all_columns, filter_text_input])

  React.useEffect(() => {
    set_shown_column_items(
      (table_state_columns || []).map((column) => ({
        ...column,
        id: column.column_id
      }))
    )
  }, [all_columns, table_state_columns])

  const handle_filter_change = (event) => {
    const { value } = event.target
    set_filter_text_input(value)

    const shown_items = []

    for (const column of table_state_columns || []) {
      if (value && !fuzzy_match(value, column.column_id)) {
        continue
      }

      shown_items.push({
        ...column,
        id: column.column_id
      })
    }

    set_shown_column_items(shown_items)
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
        variant='outlined'
        size='small'
        onClick={() =>
          set_column_controls_popper_open(!column_controls_popper_open)
        }>
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
          {prefix_columns.map((column) => (
            <div key={column.column_id} className='column-item prefix'>
              <div className='column-data-type'>
                <DataTypeIcon data_type={column.data_type} />
              </div>
              <div className='column-name'>
                {column.column_title || column.column_id}
              </div>
            </div>
          ))}
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
                  key={column.column_id}
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
            <div style={{ display: 'flex', alignSelf: 'center' }}>All</div>
          </div>
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}>
            {tree_view_columns.map((item, index) => (
              <TreeColumnItem
                key={index}
                {...{
                  item,
                  set_column_visible,
                  shown_column_index,
                  set_column_hidden
                }}
              />
            ))}
          </TreeView>
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
  on_table_state_change: PropTypes.func,
  table_state_columns: PropTypes.array,
  prefix_columns: PropTypes.array
}
