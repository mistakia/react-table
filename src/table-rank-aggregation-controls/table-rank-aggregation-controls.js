import React, { useState, useCallback, useMemo, useEffect } from 'react'
import PropTypes from 'prop-types'
import SortIcon from '@mui/icons-material/Sort'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import ClickAwayListener from '@mui/material/ClickAwayListener'

import './table-rank-aggregation-controls.styl'
import { get_string_from_object } from '../utils'
import { TABLE_DATA_TYPES } from '../constants.mjs'

const RankItem = React.memo(function RankItem({
  table_state,
  rank_item,
  all_columns = [],
  index,
  on_table_state_change
}) {
  const [rank_column, set_rank_column] = useState(
    all_columns.find(
      (column) =>
        column.column_id ===
        (rank_item.column_id || rank_item.id || rank_item.column_name)
    )
  )
  const [rank_weight, set_rank_weight] = useState(rank_item.weight)

  const handle_column_change = useCallback(
    (event, value) => {
      set_rank_column(value)

      if (!value) {
        return
      }

      const rank_param = table_state.rank_aggregation || []
      rank_param[index].column_id = value.column_id
      on_table_state_change({
        ...table_state,
        rank_aggregation: rank_param
      })
    },
    [table_state, index, on_table_state_change]
  )

  const handle_weight_change = useCallback(
    (event) => {
      const value = Number(event.target.value)
      set_rank_weight(value)

      const rank_param = table_state.rank_aggregation || []
      rank_param[index].weight = value
      on_table_state_change({
        ...table_state,
        rank_aggregation: rank_param
      })
    },
    [table_state, index, on_table_state_change]
  )

  const handle_remove_click = useCallback(() => {
    const rank_param = table_state.rank_aggregation || []
    rank_param.splice(index, 1)

    const columns = table_state.columns || []
    if (!rank_param.length) {
      const rank_column_index = columns.findIndex(
        (column) => column.column_id === 'rank_aggregation'
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
  }, [table_state, index, on_table_state_change])

  return (
    <div className='rank-item'>
      <div className='rank-item-column'>
        <Autocomplete
          size='small'
          options={all_columns}
          value={rank_column}
          componentsProps={{ popper: { style: { width: 'fit-content' } } }}
          onChange={handle_column_change}
          getOptionLabel={(option) => option.column_id}
          isOptionEqualToValue={(option, value) =>
            option.column_id === value.column_id
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
          type='number'
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
})

RankItem.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  rank_item: PropTypes.object.isRequired,
  all_columns: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired
}

const TableRankAggregationControls = ({
  table_state,
  on_table_state_change,
  all_columns = []
}) => {
  const [container_expanded, set_container_expanded] = useState(false)
  const [container_closing, set_container_closing] = useState(false)

  const items = useMemo(() => {
    const rank_param = table_state.rank_aggregation || []
    return rank_param.map((rank_item, index) => (
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
    ))
  }, [table_state, on_table_state_change, all_columns])

  const handle_add_click = useCallback(() => {
    const rank_param = table_state.rank_aggregation || []
    rank_param.push({
      column_id: all_columns[0].column_id,
      weight: 1
    })

    const columns = table_state.columns || []
    if (!columns.find((column) => column.column_id === 'rank_aggregation')) {
      columns.unshift({
        column_id: 'rank_aggregation',
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
  }, [table_state, on_table_state_change, all_columns])

  const handle_click_away = useCallback(() => {
    if (container_expanded) {
      set_container_closing(true)
      set_container_expanded(false)

      setTimeout(() => {
        set_container_closing(false)
      }, 300)
    }
  }, [container_expanded])

  const handle_container_click = useCallback(() => {
    if (container_expanded) {
      set_container_expanded(false)
      set_container_closing(true)

      setTimeout(() => {
        set_container_closing(false)
      }, 300)
    } else {
      set_container_expanded(true)
    }
  }, [container_expanded])

  const handle_key_down = useCallback(
    (event) => {
      if (event.key === 'Escape' && container_expanded) {
        set_container_closing(true)
        set_container_expanded(false)

        setTimeout(() => {
          set_container_closing(false)
        }, 300)
      }
    },
    [container_expanded]
  )

  useEffect(() => {
    if (container_expanded) {
      document.addEventListener('keydown', handle_key_down)
    } else {
      document.removeEventListener('keydown', handle_key_down)
    }

    return () => {
      document.removeEventListener('keydown', handle_key_down)
    }
  }, [container_expanded, handle_key_down])

  return (
    <ClickAwayListener onClickAway={handle_click_away}>
      <div
        className={get_string_from_object({
          'table-expanding-control-container': true,
          'table-rank-aggregation-container': true,
          '-open': container_expanded,
          '-closing': container_closing
        })}>
        <div
          className='table-expanding-control-button'
          onClick={handle_container_click}>
          <SortIcon />
          Rank
        </div>
        {container_expanded && (
          <div className='table-rank-aggregation-content'>
            {items}
            <div className='table-rank-aggregation-add'>
              <div
                className='table-rank-aggregation-add-button'
                onClick={handle_add_click}>
                <AddIcon />
                <div className='table-rank-aggregation-add-text'>
                  Add rank item
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableRankAggregationControls.propTypes = {
  table_state: PropTypes.object.isRequired,
  on_table_state_change: PropTypes.func.isRequired,
  all_columns: PropTypes.array.isRequired
}

export default React.memo(TableRankAggregationControls)
