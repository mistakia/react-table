// Which offered row axes the selected columns cannot actually SHARE.
//
// `supported_row_axes` unions `row_axes` across the selected columns, so one
// column offering an axis offers it for the whole view. That is right for an
// axis whose rows are the same rows for everybody — every column agrees what
// the year 2024 is. It is wrong for an axis whose rows are keyed on a VALUE,
// because then two columns can offer the same axis and mean different things by
// it, and the union silently says they agree.
//
// THE DEFECT THIS EXISTS FOR. league's line axis keys each row on a betting
// line, so a row labelled 199.5 puts "199.5 receiving yards" beside "199.5
// receptions" as though they were one bet at one price — unrelated quantities
// that happen to share a number, the way a price in dollars and a temperature
// in degrees both read 72. The server refuses such a request outright, but the
// picker offered the axis anyway (each column's own market_type is a ladder, so
// each column's own `row_axes` honestly contains `line`), and on 2026-09-02
// BOTH of the two saved views that carried a line axis were composed this way
// and failed at query time — every one that existed.
//
// THE DECLARATION. A column definition may carry `row_axis_domain`, an object
// mapping an axis name to a string naming the domain that column's rows key on
// for that axis. Like `row_axes` it may be a function of the instance's params,
// since the domain usually comes from a param rather than from the column id.
// Columns that declare DIFFERENT domains for one axis cannot share it.
//
// Two properties are deliberate:
//
//   - A column that offers the axis and declares no domain for it is NOT party
//     to the conflict. It is a legitimate neighbour contributing no rows of its
//     own — league's single-line betting columns are exactly this, and counting
//     them would refuse views that work.
//   - This REPORTS the conflict; it does not repair it. `row_axes` is
//     reversible user state, and dropping the axis from a stored table state
//     would turn an undoable selection into data loss while teaching the user
//     nothing about why. The caller disables the option and says who disagrees.

/**
 * @param {object} args
 * @param {Array<object>} [args.table_state_columns] - resolved columns
 * @returns {Object<string, {groups: Array<{domain: string, column_ids: string[]}>}>}
 *   keyed by axis name; only axes with more than one declared domain appear
 */
export default function resolve_row_axis_conflicts({
  table_state_columns = []
} = {}) {
  const domains_by_axis = new Map()

  for (const column of table_state_columns) {
    const declared = column?.row_axis_domain
    if (!declared) continue

    for (const axis of column.row_axes || []) {
      const domain = declared[axis]
      // Undefined means "I contribute no rows to this axis", which is silence
      // rather than disagreement. An empty string would be a domain named the
      // empty string, so the test is definedness, not truthiness.
      if (domain === undefined) continue

      if (!domains_by_axis.has(axis)) domains_by_axis.set(axis, new Map())
      const by_domain = domains_by_axis.get(axis)
      const key = String(domain)
      if (!by_domain.has(key)) by_domain.set(key, [])
      // One column instance per entry, but the same column_id can appear twice
      // with different params, and naming it twice reads as a bug in the
      // message rather than as two instances.
      if (!by_domain.get(key).includes(column.column_id)) {
        by_domain.get(key).push(column.column_id)
      }
    }
  }

  const conflicts = {}
  for (const [axis, by_domain] of domains_by_axis) {
    if (by_domain.size <= 1) continue
    conflicts[axis] = {
      groups: [...by_domain].map(([domain, column_ids]) => ({
        domain,
        column_ids
      }))
    }
  }
  return conflicts
}
