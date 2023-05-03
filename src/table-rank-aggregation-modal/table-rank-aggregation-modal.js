import React from 'react'
import PropTypes from 'prop-types'
import SortIcon from '@mui/icons-material/Sort'
import Button from '@mui/material/Button'
import Modal from '@mui/material/Modal'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'

import './table-rank-aggregation-modal.styl'
import { TABLE_DATA_TYPES } from '../constants.mjs'

function RankItem({
  table_state,
  rank_item,
  all_columns,
  index,
  on_table_state_change
}) {
  const [rank_column, set_rank_column] = React.useState(
    all_columns.find((column) => column.column_name === rank_item.column_name)
  )
  const [rank_weight, set_rank_weight] = React.useState(rank_item.weight)

  const handle_column_change = (event, value) => {
    set_rank_column(value)

    if (!value) {
      return
    }

    const rank_param = table_state.rank_aggregation || []
    rank_param[index].column_name = value.column_name
    rank_param[index].table_name = value.table_name
    on_table_state_change({
      ...table_state,
      rank_aggregation: rank_param
    })
  }

  const handle_weight_change = (event) => {
    const value = event.target.value
    set_rank_weight(value)

    const rank_param = table_state.rank_aggregation || []
    rank_param[index].weight = value
    on_table_state_change({
      ...table_state,
      rank_aggregation: rank_param
    })
  }

  const handle_remove_click = () => {
    const rank_param = table_state.rank_aggregation || []
    rank_param.splice(index, 1)

    const columns = table_state.columns || []
    if (!rank_param.length) {
      const rank_column_index = columns.findIndex(
        (column) => column.accessorKey === 'rank_aggregation'
      )
      if (rank_column_index !== -1) {
        columns.splice(rank_column_index, 1)
      }
    }

    on_table_state_change({
      ...table_state,
      columns,
      rank_aggregation: rank_param
    })
  }

  return (
    <div className='rank-item'>
      <div className='rank-item-column'>
        <Autocomplete
          size='small'
          options={all_columns}
          value={rank_column}
          onChange={handle_column_change}
          getOptionLabel={(option) => option.column_name}
          isOptionEqualToValue={(option, value) =>
            option.column_name === value.column_name
          }
          renderInput={(params) => (
            <TextField {...params} label='Column' variant='outlined' />
          )}
        />
      </div>
      <div className='rank-item-weight'>
        <TextField
          size='small'
          label='Weight'
          variant='outlined'
          value={rank_weight}
          onChange={handle_weight_change}
        />
      </div>
      <div className='rank-item-remove'>
        <IconButton size='small' onClick={handle_remove_click}>
          <DeleteIcon />
        </IconButton>
      </div>
    </div>
  )
}

RankItem.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  rank_item: PropTypes.object.isRequired,
  all_columns: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired
}

export default function TableRankAggregationModal({
  table_state,
  on_table_state_change,
  all_columns
}) {
  const [modal_open, set_modal_open] = React.useState(false)

  const items = []
  const rank_param = table_state.rank_aggregation || []
  rank_param.forEach((rank_item, index) => {
    items.push(
      <RankItem
        key={index}
        {...{
          table_state,
          on_table_state_change,
          rank_item,
          all_columns,
          index
        }}
      />
    )
  })

  const handle_add_click = () => {
    rank_param.push({
      column_name: all_columns[0].column_name,
      table_name: all_columns[0].table_name,
      weight: 1
    })

    const columns = table_state.columns || []
    if (!columns.find((column) => column.accessorKey === 'rank_aggregation')) {
      columns.unshift({
        id: 'rank_aggregation',
        accessorKey: 'rank_aggregation',
        data_type: TABLE_DATA_TYPES.NUMBER,
        header_label: 'Rank'
      })
    }

    on_table_state_change({
      ...table_state,
      columns,
      rank_aggregation: rank_param
    })
  }

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={() => set_modal_open(!modal_open)}>
        <SortIcon />
        Rank
      </Button>
      <Modal
        open={modal_open}
        onClose={() => set_modal_open(false)}
        className='table-rank-aggregation-modal'>
        <div className='table-rank-aggregation-modal-content'>
          {items}
          <div className='table-rank-aggregation-modal-add'>
            <div
              className='table-rank-aggregation-modal-add-button'
              onClick={handle_add_click}>
              <AddIcon />
              <div className='table-rank-aggregation-modal-add-text'>
                Add rank item
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

TableRankAggregationModal.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  all_columns: PropTypes.array.isRequired
}
