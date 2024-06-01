import React, { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import copy from 'copy-text-to-clipboard'

import { get_string_from_object } from '../utils'

export default function TableCell({
  getValue,
  column,
  row,
  table,
  percentiles
}) {
  if (column.columnDef.id === 'add_column_action') {
    return null
  }

  if (column.columnDef.id === 'column_index') {
    return (
      <div className='cell column-index'>
        <div className='cell-content'>{row.index + 1}</div>
      </div>
    )
  }

  const sticky_left = useMemo(() => {
    if (!column.columnDef.sticky) return 0

    const leaf_columns = table.getAllLeafColumns()
    const previous_leaf_columns = []
    let cursor = 0
    while (leaf_columns[cursor].id !== column.id) {
      previous_leaf_columns.push(leaf_columns[cursor])
      cursor++
    }
    const sticky_previous_leaf_columns = previous_leaf_columns.filter(
      (col) => col.columnDef.sticky
    )

    return sticky_previous_leaf_columns.reduce(
      (acc, col) => acc + col.getSize(),
      0
    )
  }, [column, table])

  const { sort } = table.getState()
  const is_sorted = Boolean(
    sort.find((s) => s.column_id === column.columnDef.column_id)
  )

  if (column.columnDef.component) {
    const Component = column.columnDef.component
    return (
      <div
        {...{
          className: get_string_from_object({
            cell: true,
            sorted: is_sorted,
            sticky: column.columnDef.sticky
          }),
          style: {
            width: column.getSize(),
            left: sticky_left
          }
        }}>
        <Component {...{ row, column }} />
      </div>
    )
  }

  let value = getValue()
  if (value !== undefined && value !== null && typeof value === 'object') {
    value = 'invalid value'
  }

  const handle_click = useCallback(() => {
    if (value !== undefined && value !== null) {
      copy(`${value}`)
      console.log('copied to clipboard:', value)
    }
  }, [value])

  const is_grouped = Boolean(column.parent?.columns.length)
  const is_group_end =
    is_grouped &&
    column.parent.columns[column.parent.columns.length - 1].id === column.id

  const color = useMemo(() => {
    const percentile = percentiles[column.id]
    if (percentile && !Number.isNaN(value)) {
      if (value < percentile.p25) {
        const max_percent =
          (percentile.p25 - value) / (percentile.p25 - percentile.min) / 1.5 ||
          0
        return `rgba(253, 162, 145, ${max_percent}`
      } else {
        const max_percent =
          (value - percentile.p75) / (percentile.max - percentile.p75) / 1.5 ||
          0
        return `rgba(46, 163, 221, ${max_percent}`
      }
    }
    return undefined
  }, [percentiles, column.id, value])

  return (
    <div
      {...{
        className: get_string_from_object({
          cell: true,
          sorted: is_sorted,
          group_end: is_group_end,
          sticky: column.columnDef.sticky
        }),
        style: {
          width: column.getSize(),
          left: sticky_left,
          backgroundColor: color
        },
        onClick: handle_click
      }}>
      <div
        className='cell-content'
        style={{
          padding: '5px 8px 6px',
          minHeight: '32px'
        }}>
        {value}
      </div>
    </div>
  )
}

TableCell.propTypes = {
  getValue: PropTypes.func,
  column: PropTypes.object,
  row: PropTypes.object,
  table: PropTypes.object,
  percentiles: PropTypes.object
}
