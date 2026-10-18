import { resolve_token_color } from './resolve-token-color.js'

// The chart overlays' colours, one per role, each the --rt-chart-* token of
// the same name (tokens.styl) with its light default as the fallback. The
// option builders take a palette of this shape and default to this one, which
// keeps them pure and their specs free of a DOM; the overlays pass
// resolve_chart_colors() so a host's theme reaches the chart.
export const CHART_COLOR_DEFAULTS = {
  // The bar chart's average line and its label.
  ink: '#333333',
  // The bar chart's zero line, drawn when values cross zero.
  baseline: '#666666',
  grid: '#e8e8e8',
  tier_band: 'rgba(0, 0, 0, 0.045)',
  tier_label: '#555555',
  // The scatter plot's dashed tier guides and their labels, at an opacity.
  tier_guide: '#3c3c3c',
  point_hover: '#646464',
  // Ring and outline that lift a label or marker off the bars and points
  // behind it: the chart's surface.
  halo: '#ffffff',
  // A cluster centroid's name.
  label: '#000000',
  // A bar whose row has no colour of its own.
  bar: '#4a5568',
  // The scatter plot's mean lines, at an opacity.
  mean: '#b43c3c',
  point: '#2563eb',
  point_edge: '#1e40af',
  regression: '#ff0000',
  clusters: [
    '#4e79a7',
    '#f28e2b',
    '#59a14f',
    '#e15759',
    '#76b7b2',
    '#edc948',
    '#b07aa1',
    '#9c755f'
  ]
}

const token_name = (role) => `--rt-chart-${role.replace(/_/g, '-')}`

export const resolve_chart_colors = () => {
  const resolved = {}
  for (const [role, fallback] of Object.entries(CHART_COLOR_DEFAULTS)) {
    resolved[role] =
      role === 'clusters'
        ? fallback.map((color, index) =>
            resolve_token_color(`--rt-chart-cluster-${index + 1}`, color)
          )
        : resolve_token_color(token_name(role), fallback)
  }
  return resolved
}
