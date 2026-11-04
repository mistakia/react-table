// The average row: one row pinned under the column headers carrying each
// numeric column's mean over the whole matched set, so a reader picking a
// volume qualifier sees the typical value before typing a bound.
//
// The averages are the consumer's, keyed like a cell reads its value --
// `${accessorKey}_${occurrence}` -- because they have to cover rows not yet
// loaded, which only the server can see. Only NUMBER columns show one; the
// server averages type-agnostically and a year or an id is numeric without
// being meaningful as an average.

import React, { useContext } from 'react'
import PropTypes from 'prop-types'

import { get_string_from_object } from '#src/utils'
import { table_context } from '#src/table-context'
import { TABLE_DATA_TYPES } from '#src/constants.mjs'
import { get_column_occurrence_index } from '#src/utils/get-column-occurrence-index.js'
import AddColumnActionSpacer from '#src/add-column-action-spacer'

import './table-average-row.styl'

// A volume average reads as a count -- 33.1 targets -- so one place is enough
// when the column declares no precision of its own, AND when every value it
// covers is a whole number whatever precision it declares. A count column can
// inherit a `fixed` meant for its fractional variants (league's from-plays
// factory gives carries `fixed: 2` for the per-game rate outputs), which its
// integer cells never show; its average then read 116.64 carries.
const DEFAULT_AVERAGE_FIXED_PLACES = 1

export const format_column_average = ({
  value,
  fixed,
  integer_valued = false
}) =>
  value.toFixed(
    integer_valued || fixed === undefined ? DEFAULT_AVERAGE_FIXED_PLACES : fixed
  )

const average_key = ({ table, column }) =>
  `${column.columnDef.accessorKey}_${get_column_occurrence_index({ table, column })}`

const read_column_average = ({ table, column, column_averages }) => {
  const { columnDef } = column
  if (columnDef.data_type !== TABLE_DATA_TYPES.NUMBER) return null
  if (columnDef.is_split) return null
  const value = column_averages[average_key({ table, column })]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// Whether the column's values are whole numbers, read from the rows loaded --
// the only ones the table holds. The average covers every matched row, so this
// is evidence rather than proof, and it is strong evidence in the direction
// that matters: a count is whole on every row by construction, and a
// fractional column shows fractions on its first page.
export const is_integer_valued_column = ({ table, column }) => {
  const key = average_key({ table, column })
  const values = table
    .getCoreRowModel()
    .rows.map((row) => row.original?.[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
  return values.length > 0 && values.every(Number.isInteger)
}

const TableAverageRow = ({ table, column_averages }) => {
  const { sticky_left, is_sticky_column, table_state } =
    useContext(table_context)

  const leaf_columns = table.getVisibleLeafColumns()
  // The label takes the first data-free leading cell, which is the subject
  // name column on every consumer view.
  const label_column_id = leaf_columns.find(
    (column) =>
      column.columnDef.id !== 'column_index' &&
      column.columnDef.id !== 'add_column_action'
  )?.id

  return (
    <div className='row average-row'>
      {leaf_columns.map((column) => {
        if (column.columnDef.id === 'add_column_action') {
          return <AddColumnActionSpacer key={column.id} {...{ table_state }} />
        }

        const value = read_column_average({ table, column, column_averages })
        const content =
          value !== null
            ? format_column_average({
                value,
                fixed: column.columnDef.fixed,
                integer_valued: is_integer_valued_column({ table, column })
              })
            : column.id === label_column_id
              ? 'Average'
              : null

        return (
          <div
            key={column.id}
            className={get_string_from_object({
              cell: true,
              'column-index': column.columnDef.id === 'column_index',
              sticky: is_sticky_column(column),
              'average-row-label': column.id === label_column_id
            })}
            style={{ width: column.getSize(), left: sticky_left(column) }}>
            <div className='cell-content'>{content}</div>
          </div>
        )
      })}
    </div>
  )
}

TableAverageRow.propTypes = {
  table: PropTypes.object.isRequired,
  column_averages: PropTypes.object.isRequired
}

export default TableAverageRow
