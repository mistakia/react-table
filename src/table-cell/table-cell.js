import React, { useMemo, useCallback, useContext } from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '../utils'
import { table_context } from '../table-context'

const TableCell = ({ getValue, column, row, table }) => {
  const { sticky_left } = useContext(table_context)

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

  const { enable_duplicate_column_ids, percentiles } = useContext(table_context)

  const column_index = useMemo(() => {
    const columns_with_same_id = table
      .getAllLeafColumns()
      .filter((col) => col.columnDef.column_id === column.columnDef.column_id)
    const sorted_columns_with_same_id = columns_with_same_id.sort(
      (a, b) => a.columnDef.index - b.columnDef.index
    )

    return sorted_columns_with_same_id.findIndex(
      (col) => col.columnDef.index === column.columnDef.index
    )
  }, [column, table])

  const sticky_left_value = sticky_left(column)

  const { sort } = table.getState()
  const is_sorted = Boolean(
    sort.find(
      (s) =>
        s.column_id === column.columnDef.column_id &&
        (s.column_index || 0) === column_index
    )
  )

  let value

  if (column.columnDef.is_split) {
    value = row.original[column.columnDef.id]
  } else if (enable_duplicate_column_ids) {
    const accessor_path = `${column.columnDef.accessorKey}_${column_index}`
    value = row.original[accessor_path]
  } else {
    value = getValue()
  }

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
            left: sticky_left_value
          }
        }}>
        <Component {...{ row, column, column_index, value }} />
      </div>
    )
  }

  if (value !== undefined && value !== null && typeof value === 'object') {
    value = 'invalid value'
  }

  if (
    typeof value === 'number' &&
    !Number.isInteger(value) &&
    column.columnDef.fixed !== undefined
  ) {
    const fixed_places = column.columnDef.fixed
    value = value.toFixed(fixed_places)
  }

  const handle_click = useCallback(() => {
    if (value !== undefined && value !== null) {
      navigator.clipboard
        .writeText(`${value}`)
        .then(() => {
          console.log('copied to clipboard:', value)
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err)
        })
    }
  }, [value])

  const is_grouped = Boolean(column.parent?.columns.length)
  const is_group_end =
    is_grouped &&
    column.parent.columns[column.parent.columns.length - 1].id === column.id

  const color = useMemo(() => {
    const key = enable_duplicate_column_ids
      ? `${column.columnDef.accessorKey}_${column_index}`
      : column.columnDef.accessorKey
    const percentile = percentiles[key]
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
          left: sticky_left_value,
          backgroundColor: color
        },
        onClick: handle_click
      }}>
      <div
        className='cell-content'
        style={{
          padding: '5px 8px 6px',
          minHeight: '32px',
          // TODO dynamically calculate based on largest character count in this column
          minWidth: `min(${column.columnDef.size}px, 100%)`
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
  percentiles: PropTypes.object,
  enable_duplicate_column_ids: PropTypes.bool
}

export default React.memo(TableCell)
