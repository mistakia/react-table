// Pure derivation for the ranked bar chart. Everything the chart SAYS -- which
// bars exist, in what order, what colour, where the average sits, how many
// decimals a value label shows -- is decided here and nowhere else, so it can
// be asserted without a Highcharts instance. The overlay component is left
// holding only chrome and option assembly.
//
// Nothing in this file may know about any consumer's domain. Subject identity,
// colour and logo all arrive as caller-supplied resolvers.

// Zero is KEPT, unlike the scatter plot, which drops it. There a zero is an
// unplaced point clustering against an axis edge; here it is a rank -- the
// subject that did the thing zero times sits in its rightful place at the
// baseline, and dropping it would silently renumber every bar around it.
export const filter_bar_rows = ({ data, accessor_path }) =>
  (data || []).filter((row) => {
    const raw = row?.[accessor_path]
    if (raw == null) return false
    return isFinite(Number(raw))
  })

// Ascending, so the chart reads left-to-right worst-to-best like the reference.
// Ties break on label to keep the order stable across re-renders rather than
// leaving it to the sort implementation.
export const sort_bar_rows = ({ rows, accessor_path, get_label }) =>
  [...rows].sort((a, b) => {
    const delta = Number(a[accessor_path]) - Number(b[accessor_path])
    if (delta !== 0) return delta
    return String(get_label(a) ?? '').localeCompare(String(get_label(b) ?? ''))
  })

// How many bars a chart draws when the caller has not said. Above every
// team-grain set a sports consumer produces -- 32 subjects reads exactly like
// the reference and must not be silently clipped by a cap meant for a
// different problem -- and low enough that a 500-row player result stops being
// a solid smear of overlapping logos and a diagonal band of category labels.
export const DEFAULT_BAR_CHART_ROW_LIMIT = 40

// Which END of the ranking survives the cap. Rows arrive sorted ascending, so
// the best values are at the TAIL: `top` keeps the tail, `bottom` the head.
// Nothing here elides a middle. A ranked bar chart with a gap in its axis
// invites the reader to compare two bars that are not adjacent in rank, which
// is the one thing this chart type is supposed to make impossible.
export const select_rank_window = ({
  rows,
  row_limit = null,
  rank_window = 'top'
}) => {
  const limit =
    Number.isInteger(row_limit) && row_limit > 0
      ? row_limit
      : DEFAULT_BAR_CHART_ROW_LIMIT
  if (rows.length <= limit) return rows
  return rank_window === 'bottom'
    ? rows.slice(0, limit)
    : rows.slice(rows.length - limit)
}

// A truncated ranked chart that does not say it is truncated misleads worse
// than a crowded one: every bar is still true, and the SET is a lie. So this
// is derived from the counts rather than taken from the caller, carries no
// option to suppress it, and comes back null in the only case where silence is
// honest -- nothing was dropped.
export const build_scope_text = ({
  drawn_count,
  total_count,
  rank_window = 'top'
}) => {
  if (drawn_count >= total_count) return null
  const end = rank_window === 'bottom' ? 'Bottom' : 'Top'
  return `${end} ${drawn_count} of ${total_count} rows`
}

export const compute_average = (values) => {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

// Value labels carry the precision the DATA has, not a fixed two places. An
// EPA-per-play column lives entirely inside +/-0.25 and rounds to "0.0" at one
// decimal; a receiving-yards column runs to four digits and reads as noise at
// three. Driven off the largest magnitude present so every bar in one chart
// formats alike -- a per-bar rule would ladder the decimals down the axis.
export const resolve_value_decimals = ({ values, override = null }) => {
  if (Number.isInteger(override) && override >= 0) return override
  if (!values.length) return 2

  const max_magnitude = Math.max(...values.map((value) => Math.abs(value)))
  if (max_magnitude === 0) return 0
  if (max_magnitude < 1) return 3
  if (max_magnitude < 10) return 2
  if (max_magnitude < 1000) return 1
  return 0
}

export const format_bar_value = ({ value, decimals }) =>
  Number(value).toFixed(decimals)

// The bar series carries the value; the logo series is separate because a
// Highcharts column point cannot take an image marker. Both are indexed on the
// same category positions, so point i of one sits over bar i of the other.
export const build_bar_points = ({
  rows,
  accessor_path,
  get_label,
  get_color = null
}) =>
  rows.map((row) => {
    const value = Number(row[accessor_path])
    const point = {
      y: value,
      label: get_label(row),
      original_data: row
    }
    const color = get_color ? get_color(row) : null
    if (color) point.color = color
    return point
  })

// Logos ride at the bar's value end -- centred ON the end, half over the bar
// and half clear of it, which is what the reference does and what keeps a
// short bar's logo legible. Sign is irrelevant here: y = value puts it at the
// end of a downward bar exactly as it does an upward one.
export const build_logo_points = ({
  rows,
  accessor_path,
  get_image,
  logo_size
}) => {
  if (!get_image) return []
  return rows
    .map((row, index) => {
      const image = get_image({ row, logo_size, total_rows: rows.length })
      if (!image) return null
      return {
        x: index,
        y: Number(row[accessor_path]),
        marker: {
          symbol: `url(${image.url})`,
          width: image.width || logo_size,
          height: image.height || logo_size
        }
      }
    })
    .filter(Boolean)
}

// Headroom for the value labels, which are drawn OUTSIDE the bar end and are
// clipped by an axis fitted to the data alone. Padding is a fraction of the
// full span rather than of each extreme, so a chart whose values are all
// positive still gets the same visual gap at the top as a mixed one.
//
// The zero baseline is forced into range whenever the data is single-signed:
// a ranked bar chart drawn from a non-zero floor overstates every difference
// on it, which is the single most common way this chart type misleads.
//
// `include_value` forces one further value into range, and it exists for the
// average on a TRUNCATED chart. The extremes are fitted to the bars actually
// drawn, and a top-40 window of a 500-row set sits entirely on one side of the
// full set's average -- so an axis fitted to the bars alone puts the average
// line off the plot, where Highcharts simply does not draw it. A reference
// line that silently disappears is worse than no reference line.
export const compute_axis_extremes = ({
  values,
  padding_ratio = 0.18,
  include_value = null
}) => {
  if (!values.length) return { min: null, max: null }

  const in_range =
    include_value == null || !isFinite(include_value)
      ? values
      : [...values, Number(include_value)]

  const data_min = Math.min(...in_range)
  const data_max = Math.max(...in_range)

  const floor = Math.min(0, data_min)
  const ceiling = Math.max(0, data_max)
  const span = ceiling - floor

  // Every value identical and zero, or a single zero row: nothing to scale
  // against, so hand back a symmetric unit window rather than a zero-height
  // axis, which Highcharts renders as a flat line with no baseline at all.
  if (span === 0) return { min: -1, max: 1 }

  const padding = span * padding_ratio
  return {
    min: floor < 0 ? floor - padding : 0,
    max: ceiling > 0 ? ceiling + padding : 0
  }
}

// One call, so a caller cannot assemble half of this correctly. Returns
// everything the overlay needs to build Highcharts options, including the
// empty case -- `is_empty` is the component's cue to render its own message
// rather than a chart with no bars, which draws as an axis pair over blank
// space and reads as a failure.
export const derive_bar_chart_data = ({
  data,
  accessor_path,
  get_label = () => '',
  get_color = null,
  get_image = null,
  logo_size = 28,
  value_decimals_override = null,
  row_limit = null,
  rank_window = 'top',
  include_average_in_extremes = true
}) => {
  const filtered = filter_bar_rows({ data, accessor_path })
  const ranked = sort_bar_rows({ rows: filtered, accessor_path, get_label })
  const rows = select_rank_window({ rows: ranked, row_limit, rank_window })
  const values = rows.map((row) => Number(row[accessor_path]))

  // Over every row that MATCHED, not over the window that got drawn. The
  // average of the top 40 of 500 is a number about the top 40, and a line
  // labelled "Average" running through a chart of the best subjects is read as
  // the population's average by everyone who looks at it. Truncating the
  // subjects must not truncate what they are being compared against.
  const average = compute_average(
    ranked.map((row) => Number(row[accessor_path]))
  )

  return {
    rows,
    values,
    is_empty: rows.length === 0,
    total_row_count: ranked.length,
    is_truncated: rows.length < ranked.length,
    scope_text: build_scope_text({
      drawn_count: rows.length,
      total_count: ranked.length,
      rank_window
    }),
    categories: rows.map((row) => String(get_label(row) ?? '')),
    bar_points: build_bar_points({
      rows,
      accessor_path,
      get_label,
      get_color
    }),
    logo_points: build_logo_points({
      rows,
      accessor_path,
      get_image,
      logo_size
    }),
    average,
    value_decimals: resolve_value_decimals({
      values,
      override: value_decimals_override
    }),
    axis_extremes: compute_axis_extremes({
      values,
      include_value: include_average_in_extremes ? average : null
    }),
    has_negative_values: values.some((value) => value < 0)
  }
}
