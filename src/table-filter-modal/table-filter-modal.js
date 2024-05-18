import React from 'react'
import PropTypes from 'prop-types'
import Modal from '@mui/material/Modal'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import IconButton from '@mui/material/IconButton'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { Popper } from '@mui/base/Popper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
// import ListIcon from '@mui/icons-material/List'
import DeleteIcon from '@mui/icons-material/Delete'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem2 } from '@mui/x-tree-view/TreeItem2'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import {
  debounce,
  group_columns_into_tree_view,
  fuzzy_match,
  get_string_from_object
} from '../utils'

import './table-filter-modal.styl'

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
  shown_column_index = {},
  table_state,
  on_table_state_change
}) {
  const sub_item_path = `${item_path}/${item.header || item.column_title}`

  if (!item.columns) {
    return (
      <TreeItem2
        itemId={item.column_id}
        nodeId={sub_item_path}
        slots={{
          content: FilterItem
        }}
        slotProps={{
          content: {
            column_item: item,
            is_visible: shown_column_index[item.column_id],
            table_state,
            on_table_state_change
          }
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
          {...{ shown_column_index, table_state, on_table_state_change }}
        />
      )
    })
  }

  const label = (item.header || item.column_title).toLowerCase()
  const label_with_count = `${label} (${get_column_group_column_count(
    item.columns
  )})`

  return (
    <TreeItem2
      itemId={item.column_id}
      nodeId={sub_item_path}
      label={label_with_count}>
      {sub_items}
    </TreeItem2>
  )
}

TreeColumnItem.propTypes = {
  item: PropTypes.object.isRequired,
  item_path: PropTypes.string,
  shown_column_index: PropTypes.object,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired
}

function FilterItem({
  column_item,
  table_state,
  on_table_state_change,
  is_visible
}) {
  const anchor_el = React.useRef()
  const where_item = React.useMemo(() => {
    const where_param = table_state.where || []
    return (
      where_param.find((item) => item.column_id === column_item.column_id) || {}
    )
  }, [table_state, column_item])
  const [filter_value, set_filter_value] = React.useState(
    where_item?.value || null
  )
  const [misc_menu_open, set_misc_menu_open] = React.useState(false)

  React.useEffect(() => {
    return () => {
      set_misc_menu_open(false)
    }
  }, [])

  const handle_create_filter = ({ operator = '=', value = '' }) => {
    const where_param = table_state.where || []
    where_param.push({
      column_id: column_item.column_id,
      operator,
      value
    })
    on_table_state_change({
      ...table_state,
      where: where_param
    })
    set_misc_menu_open(false)
  }

  const handle_remove_click = () => {
    const where_param = table_state.where || []
    const index = where_param.findIndex(
      (item) => item.column_id === where_item.column_id
    )
    where_param.splice(index, 1)
    on_table_state_change({
      ...table_state,
      where: where_param
    })
    set_misc_menu_open(false)
  }

  const handle_operator_change = (event) => {
    const where_param = table_state.where || []
    const index = where_param.findIndex(
      (item) => item.column_id === where_item.column_id
    )

    if (index === -1) {
      return handle_create_filter({
        operator: event.target.value
      })
    }

    where_param[index].operator = event.target.value
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }

  const handle_value_change_debounced = debounce((event) => {
    const where_param = table_state.where || []
    const index = where_param.findIndex(
      (item) => item.column_id === where_item.column_id
    )

    if (index === -1) {
      return handle_create_filter({
        value: event.target.value
      })
    }

    where_param[index].value = event.target.value
    on_table_state_change({
      ...table_state,
      where: where_param
    })
  }, 3000)

  const handle_value_change = (event) => {
    set_filter_value(event.target.value)
    handle_value_change_debounced(event)
  }

  const show_value = () => {
    if (
      where_item.operator === 'IS NULL' ||
      where_item.operator === 'IS NOT NULL'
    ) {
      return false
    }

    return true
  }

  return (
    <div
      className={get_string_from_object({
        'filter-item': true,
        visible: is_visible
      })}>
      <div className='filter-item-left'>
        <div className='filter-item-left-column'>
          {column_item.column_title || column_item.column_id}
        </div>
        <div className='filter-item-left-operator'>
          <FormControl>
            <InputLabel id='operator-label'>Operator</InputLabel>
            <Select
              size='small'
              value={where_item.operator}
              onChange={handle_operator_change}
              label='Operator'
              labelId='operator-label'
              variant='outlined'
              defaultValue='='>
              <MenuItem value='='>Equal to</MenuItem>
              <MenuItem value='!='>Not equal to</MenuItem>
              <MenuItem value='>'>Greater than</MenuItem>
              <MenuItem value='>='>Greater than or equal</MenuItem>
              <MenuItem value='<'>Less than</MenuItem>
              <MenuItem value='<='>Less than or equal</MenuItem>
              <MenuItem value='LIKE'>Like</MenuItem>
              <MenuItem value='NOT LIKE'>Not like</MenuItem>
              <MenuItem value='IN'>In</MenuItem>
              <MenuItem value='NOT IN'>Not in</MenuItem>
              <MenuItem value='IS NULL'>Is empty</MenuItem>
              <MenuItem value='IS NOT NULL'>Is not empty</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div className='filter-item-left-value'>
          <TextField
            size='small'
            label='Value'
            variant='outlined'
            disabled={!show_value()}
            value={filter_value}
            onChange={handle_value_change}
          />
        </div>
      </div>
      <div className='filter-item-right'>
        <ClickAwayListener onClickAway={() => set_misc_menu_open(false)}>
          <div>
            <IconButton
              className='filter-item-right-action'
              ref={anchor_el}
              onClick={() => set_misc_menu_open(!misc_menu_open)}>
              <MoreHorizIcon />
            </IconButton>
            <Popper
              className='misc-menu'
              open={misc_menu_open}
              anchorEl={anchor_el.current}
              placement='bottom-start'>
              <div>
                <div className='misc-menu-item' onClick={handle_remove_click}>
                  <div className='misc-menu-item-icon'>
                    <DeleteIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Remove</div>
                </div>
                {/* <div className='misc-menu-item'>
                  <div className='misc-menu-item-icon'>
                    <ListIcon size='small' />
                  </div>
                  <div className='misc-menu-item-text'>Turn into group</div>
                </div> */}
              </div>
            </Popper>
          </div>
        </ClickAwayListener>
      </div>
    </div>
  )
}

FilterItem.propTypes = {
  column_item: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  is_visible: PropTypes.bool.isRequired
}

export default function TableFilterModal({
  filter_modal_open,
  set_filter_modal_open,
  table_state,
  on_table_state_change,
  all_columns
}) {
  const [filter_text_input, set_filter_text_input] = React.useState('')

  const shown_column_index = React.useMemo(() => {
    const index = {}

    for (const item of table_state.where || []) {
      index[item.column_id] = true
    }

    return index
  }, [table_state])

  const tree_view_columns = React.useMemo(() => {
    if (!filter_text_input) {
      return group_columns_into_tree_view(all_columns)
    }

    const filtered_columns = all_columns.filter((column) =>
      fuzzy_match(filter_text_input, column.column_title || column.column_id)
    )
    return group_columns_into_tree_view(filtered_columns)
  }, [all_columns, filter_text_input])

  const handle_filter_change = (event) => {
    const { value } = event.target
    set_filter_text_input(value)
  }

  return (
    <Modal
      open={filter_modal_open}
      keepMounted={true}
      onClose={() => set_filter_modal_open(false)}
      className='table-filter-modal'>
      <div className='table-filter-modal-content'>
        <div className='filter-input'>
          <TextField
            id='outlined-basic'
            label='Search filters'
            placeholder='Search for a filter'
            variant='outlined'
            size='small'
            value={filter_text_input}
            onChange={handle_filter_change}
            fullWidth
            autoFocus
          />
        </div>
        <SimpleTreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}>
          {tree_view_columns.map((item, index) => (
            <TreeColumnItem
              key={index}
              {...{
                item,
                shown_column_index,
                table_state,
                on_table_state_change
              }}
            />
          ))}
        </SimpleTreeView>
      </div>
    </Modal>
  )
}

TableFilterModal.propTypes = {
  filter_modal_open: PropTypes.bool.isRequired,
  set_filter_modal_open: PropTypes.func.isRequired,
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  all_columns: PropTypes.array.isRequired
}
