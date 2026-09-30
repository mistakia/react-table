/**
 * Pure utility for resolving per-point color in scatter plot overlays.
 * Separated from the main overlay module so it can be imported in test
 * environments that lack the highcharts peer dependency.
 */

/**
 * Resolves a per-point color string for a scatter plot data row.
 *
 * @param {object} params
 * @param {object} params.row - Data row
 * @param {string|undefined} params.point_color_mode - 'team' | 'position' | 'cluster' | undefined
 * @param {Function|null} params.get_point_color - Consumer-supplied resolver
 * @param {string|undefined} params.cluster_color - The row's cluster color; the
 *   library owns cluster mode, so the consumer resolver is not consulted
 * @returns {string|undefined} hex color string, or undefined if not applicable
 */
export const resolve_point_color = ({
  row,
  point_color_mode,
  get_point_color,
  cluster_color
}) => {
  if (point_color_mode === 'cluster') return cluster_color || undefined
  if (!point_color_mode || !get_point_color) return undefined
  return get_point_color(row) || undefined
}
