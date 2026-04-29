// Pure helper — no Highcharts import so this file can be unit-tested in isolation.

/**
 * Build the series-level dataLabels config for scatter plots.
 *
 * Highcharts applies this config to every point in the series. Per-point dataLabels
 * objects must NOT be used for color: they would silently overwrite this config and
 * lose the outlier-only formatter and allowOverlap:false (S6 fix).
 *
 * Color is handled via the top-level `color` callback (not style.color, which only
 * accepts a plain CSS string). The callback reads this.point.color, which is set
 * per-point when point_color_mode is active. In uniform mode point.color is
 * undefined and Highcharts falls back to its theme default.
 *
 * get_scatter_point_label_suffix (optional): consumer-provided function called with
 * the per-point row (this.point.options.original_data). Returns a string suffix to
 * append to the label (e.g. ' (2022)' or ' (2022 W5)'). Empty string means no suffix.
 */
export const build_scatter_data_labels = ({
  labels_enabled,
  get_scatter_point_label_suffix = null
}) => ({
  enabled: labels_enabled,
  formatter: function () {
    if (!this.point.is_outlier) return null
    const suffix = get_scatter_point_label_suffix
      ? get_scatter_point_label_suffix(this.point.options.original_data) || ''
      : ''
    return this.point.label + suffix
  },
  // Highcharts hides overlapping labels silently; outlier-only filter keeps density low. See task S7.
  allowOverlap: false,
  align: 'right',
  verticalAlign: 'middle',
  // dataLabels.color (top-level, not style.color) accepts a callback function via formatter context.
  // style.color is a plain CSS string and cannot be a function. Using top-level color callback
  // lets each label inherit its point's fill color without per-point dataLabels overrides.
  // When point.color is undefined (uniform mode), returns undefined and Highcharts uses theme default.
  color: function () {
    return this.point.color || undefined
  },
  style: {
    pointerEvents: 'none',
    textOutline: '2px white',
    fontWeight: 'normal',
    fontSize: '11px'
  }
})
