// Share of the scroll container's visible width the pinned columns may occupy.
// Without a cap, a wide prefix set covers a narrow viewport entirely -- five
// prefix columns totalling 470px on a 390px phone leave no width in which any
// data column can ever be scrolled into view.
export const STICKY_WIDTH_BUDGET_RATIO = 0.5

// Which of the declared-sticky columns actually get pinned at this width.
//
// Columns are admitted in order until the running total would exceed
// STICKY_WIDTH_BUDGET_RATIO of the visible width; the rest render unpinned and
// scroll with the table. Admission stops at the first column that does not fit
// rather than skipping it, because the pinned set has to stay a contiguous
// prefix -- an unpinned column between two pinned ones would slide under them.
//
// Two deliberate exceptions:
//   - The first sticky column is always admitted. On a viewport too narrow for
//     even one, losing the row's identity is worse than losing the width.
//   - container_width 0 means "not measured yet" and admits everything, so the
//     first paint does not flash an unpinned table before the observer reports.
export default function resolve_sticky_column_ids({
  sticky_columns,
  container_width,
  ratio = STICKY_WIDTH_BUDGET_RATIO
}) {
  const budget = container_width * ratio
  const ids = new Set()
  let total_width = 0

  for (const column of sticky_columns) {
    const next_total_width = total_width + column.getSize()
    if (ids.size && container_width && next_total_width > budget) {
      break
    }
    ids.add(column.id)
    total_width = next_total_width
  }

  return ids
}
