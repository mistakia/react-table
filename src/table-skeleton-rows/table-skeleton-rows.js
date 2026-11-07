// Placeholder rows while the table's read is in flight. Without them a
// loading table is its header and progress bar over nothing, and every row
// that lands pushes the page below it down. Each placeholder row is a real
// `.row` of `.cell`s at the visible columns' own widths, so the column rules
// and the 32px row height match the rows that replace them.

import React from 'react'
import PropTypes from 'prop-types'

import './table-skeleton-rows.styl'

// Enough rows to fill a typical first screen under the header.
export const SKELETON_ROW_COUNT = 12

// Columns the table adds around the consumer's: the row-number gutter and the
// trailing add-column control. They keep their width and draw no bar.
const CHROME_COLUMN_IDS = new Set(['column_index', 'add_column_action'])

// Ragged bar widths, so a run of rows reads as text rather than a grid.
const BAR_WIDTHS = ['72%', '48%', '60%', '84%', '54%']

const TableSkeletonRows = ({ table, row_count = SKELETON_ROW_COUNT }) => {
  const columns = table.getVisibleLeafColumns()
  return (
    <div className='body table-skeleton-rows' aria-hidden='true'>
      {Array.from({ length: row_count }, (_, row_index) => (
        <div key={row_index} className='row table-skeleton-row'>
          {columns.map((column, column_index) => (
            <div
              key={column.id}
              className='cell'
              style={{ width: column.getSize() }}>
              {!CHROME_COLUMN_IDS.has(column.id) && (
                <span
                  className='table-skeleton-bar'
                  style={{
                    width:
                      BAR_WIDTHS[(row_index + column_index) % BAR_WIDTHS.length]
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

TableSkeletonRows.propTypes = {
  table: PropTypes.object.isRequired,
  row_count: PropTypes.number
}

export default TableSkeletonRows
