/* global describe it */
import { expect } from 'chai'

import find_columns_with_no_data from '#src/utils/find-columns-with-no-data.js'

describe('find_columns_with_no_data', function () {
  it('reports a key that is null on every row', function () {
    const rows = [
      { pid: 'A', line_0: null },
      { pid: 'B', line_0: null }
    ]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal(['line_0'])
  })

  it('does not report a key holding a real value on any row', function () {
    // The control for the assertion above: one row moves from null to a value
    // and the key must drop out.
    const rows = [
      { pid: 'A', line_0: null },
      { pid: 'B', line_0: 0.5 }
    ]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal([])
  })

  it('treats zero as a value, not as emptiness', function () {
    // The whole point: a column of zeroes is DATA and must not be flagged, and
    // it is exactly what an empty column was being mistaken for.
    const rows = [
      { pid: 'A', touchdowns_0: 0 },
      { pid: 'B', touchdowns_0: 0 }
    ]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal([])
  })

  it('treats an empty string and false as values', function () {
    const rows = [
      { note_0: '', flag_0: false },
      { note_0: '', flag_0: false }
    ]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal([])
  })

  it('reports a key that is undefined on every row it appears in', function () {
    const rows = [
      { pid: 'A', line_0: undefined },
      { pid: 'B', line_0: undefined }
    ]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal(['line_0'])
  })

  it('never reports a key absent from the rows entirely', function () {
    // A false positive here would put a warning on a column that simply is not
    // projected under this shape, so absence must not read as emptiness.
    const rows = [{ pid: 'A' }, { pid: 'B' }]
    expect(find_columns_with_no_data(rows).has('line_0')).to.equal(false)
  })

  it('returns an empty set for no rows', function () {
    expect([...find_columns_with_no_data([])]).to.deep.equal([])
    expect([...find_columns_with_no_data(undefined)]).to.deep.equal([])
    expect([...find_columns_with_no_data(null)]).to.deep.equal([])
  })

  it('handles a key that is null on one row and absent on another', function () {
    // Present-and-null anywhere plus never-a-value is still an empty column.
    const rows = [{ pid: 'A', line_0: null }, { pid: 'B' }]
    expect([...find_columns_with_no_data(rows)]).to.deep.equal(['line_0'])
  })
})
