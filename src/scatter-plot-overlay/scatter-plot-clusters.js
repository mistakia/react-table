/**
 * Pure cluster derivation and Highcharts series builders for the scatter plot
 * overlay: turns the filtered axis values plus scatter_plot_options into
 * ordered, named, colored clusters.
 *
 * No Highcharts import — keeps this unit-testable in isolation.
 */

import {
  cluster_k_means,
  compute_silhouette_score,
  create_natural_breaks_solver,
  select_cluster_count,
  standardize_values
} from '../utils/cluster-points.js'

// Colorblind-considerate categorical palette (Tableau 10 subset). Data
// encoding inside chart options, like the regression and tier colors.
export const CLUSTER_PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#59a14f',
  '#e15759',
  '#76b7b2',
  '#edc948',
  '#b07aa1',
  '#9c755f'
]

export const MIN_CLUSTER_COUNT = 2
export const MAX_CLUSTER_COUNT = 8
// Silhouette scoring favors a coarse split in one dimension (two tiers on
// age against rest-of-season points), so choosing natural tiers starts at a
// fixed count; Auto stays one click away.
export const DEFAULT_NATURAL_TIER_COUNT = 5

const K_MEANS_SEED = 1

export const hex_to_rgba = (hex, alpha) => {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

const cross = (origin, a, b) =>
  (a[0] - origin[0]) * (b[1] - origin[1]) -
  (a[1] - origin[1]) * (b[0] - origin[0])

/**
 * Convex hull by Andrew's monotone chain. Collinear boundary points are
 * dropped; the hull is returned counter-clockwise without repeating the start.
 *
 * @param {number[][]} points - [x, y] pairs
 * @returns {number[][]}
 */
export const compute_convex_hull = (points) => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const unique = sorted.filter(
    (point, index) =>
      index === 0 ||
      point[0] !== sorted[index - 1][0] ||
      point[1] !== sorted[index - 1][1]
  )
  if (unique.length < 3) return unique

  const lower = []
  for (const point of unique) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper = []
  for (let i = unique.length - 1; i >= 0; i--) {
    const point = unique[i]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop()
    }
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

const describe_level = (z_score) => {
  if (z_score < -0.5) return 'Low'
  if (z_score > 0.5) return 'High'
  return 'Mid'
}

const mean_of = (values) =>
  values.reduce((sum, value) => sum + value, 0) / values.length

const spread_of = (values, mean) =>
  Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  )

const run_clustering = ({ cluster_count, cluster_fn, points }) => {
  if (cluster_count == null) {
    const selection = select_cluster_count({
      points,
      cluster_fn,
      min_count: MIN_CLUSTER_COUNT,
      max_count: MAX_CLUSTER_COUNT
    })
    if (!selection) return null
    return {
      cluster_count: selection.cluster_count,
      assignments: selection.result.assignments,
      silhouette_score: selection.silhouette_score,
      is_automatic_count: true
    }
  }
  const result = cluster_fn(cluster_count)
  if (!result) return null
  return {
    cluster_count,
    assignments: result.assignments,
    silhouette_score: compute_silhouette_score({
      points,
      assignments: result.assignments
    }),
    is_automatic_count: false
  }
}

/**
 * Cluster the plotted points per scatter_plot_options.
 *
 * Clusters are ordered best-first by a direction-aware score: an axis whose
 * column sets reverse_percentiles counts lower values as better. Natural
 * breaks order by the clustered value; k-means by the combined standardized
 * centroid. The order is what makes tier numbering and positional
 * cluster_names stable.
 *
 * @param {object} params
 * @param {number[]} params.x_values
 * @param {number[]} params.y_values
 * @param {boolean} [params.x_reversed]
 * @param {boolean} [params.y_reversed]
 * @param {string} params.x_label
 * @param {string} params.y_label
 * @param {object} params.scatter_plot_options
 * @returns {object|null} null when clustering is off or there are too few points
 */
export const derive_scatter_clusters = ({
  x_values,
  y_values,
  x_reversed = false,
  y_reversed = false,
  x_label,
  y_label,
  scatter_plot_options = {}
}) => {
  const method = scatter_plot_options.cluster_method
  if (method !== 'k_means' && method !== 'natural_breaks') return null

  const requested_count = scatter_plot_options.cluster_count ?? null
  const point_count = x_values?.length || 0
  const minimum_points =
    requested_count == null ? MIN_CLUSTER_COUNT * 2 : requested_count * 2
  if (point_count < minimum_points) return null

  const x_standardized = standardize_values(x_values).values
  const y_standardized = standardize_values(y_values).values
  const x_sign = x_reversed ? -1 : 1
  const y_sign = y_reversed ? -1 : 1

  let clustering
  let order_values
  const natural_breaks_axis =
    scatter_plot_options.natural_breaks_axis || 'combined'
  if (method === 'k_means') {
    const points = x_standardized.map((x, i) => [x, y_standardized[i]])
    clustering = run_clustering({
      cluster_count: requested_count,
      points,
      cluster_fn: (cluster_count) =>
        cluster_k_means({ points, cluster_count, seed: K_MEANS_SEED })
    })
    order_values = x_standardized.map(
      (x, i) => x_sign * x + y_sign * y_standardized[i]
    )
  } else {
    let values
    if (natural_breaks_axis === 'x') values = x_values.map((x) => x_sign * x)
    else if (natural_breaks_axis === 'y') {
      values = y_values.map((y) => y_sign * y)
    } else {
      values = x_standardized.map(
        (x, i) => x_sign * x + y_sign * y_standardized[i]
      )
    }
    clustering = run_clustering({
      cluster_count: requested_count,
      points: values.map((value) => [value]),
      cluster_fn: create_natural_breaks_solver({
        values,
        max_count: requested_count ?? MAX_CLUSTER_COUNT
      })
    })
    order_values = values
  }
  if (!clustering) return null

  const { cluster_count, is_automatic_count } = clustering
  const members = Array.from({ length: cluster_count }, () => [])
  clustering.assignments.forEach((cluster, index) =>
    members[cluster].push(index)
  )

  const ranked = members
    .map((indexes, raw_index) => ({
      raw_index,
      indexes,
      score: mean_of(indexes.map((index) => order_values[index]))
    }))
    .filter(({ indexes }) => indexes.length)
    .sort((a, b) => b.score - a.score || a.raw_index - b.raw_index)

  const rank_by_raw_index = new Map(
    ranked.map(({ raw_index }, rank) => [raw_index, rank])
  )
  const assignments = clustering.assignments.map((cluster) =>
    rank_by_raw_index.get(cluster)
  )

  const custom_names = scatter_plot_options.cluster_names || []
  const auto_names = ranked.map(({ indexes }, rank) => {
    if (method === 'natural_breaks') return `Tier ${rank + 1}`
    const x_level = describe_level(
      mean_of(indexes.map((index) => x_standardized[index]))
    )
    const y_level = describe_level(
      mean_of(indexes.map((index) => y_standardized[index]))
    )
    return `${x_level} ${x_label} · ${y_level} ${y_label}`
  })
  const name_counts = {}
  const names = auto_names.map((name, rank) => {
    if (custom_names[rank]) return custom_names[rank]
    const seen = auto_names.filter((other) => other === name).length
    if (seen < 2) return name
    name_counts[name] = (name_counts[name] || 0) + 1
    return `${name} (${name_counts[name]})`
  })

  const clusters = ranked.map(({ indexes }, rank) => {
    const xs = indexes.map((index) => x_values[index])
    const ys = indexes.map((index) => y_values[index])
    const centroid_x = mean_of(xs)
    const centroid_y = mean_of(ys)
    return {
      name: names[rank],
      automatic_name: auto_names[rank],
      color: CLUSTER_PALETTE[rank % CLUSTER_PALETTE.length],
      count: indexes.length,
      centroid_x,
      centroid_y,
      x_spread: spread_of(xs, centroid_x),
      y_spread: spread_of(ys, centroid_y),
      hull: compute_convex_hull(xs.map((x, i) => [x, ys[i]]))
    }
  })

  return {
    method,
    natural_breaks_axis:
      method === 'natural_breaks' ? natural_breaks_axis : null,
    cluster_count: clusters.length,
    is_automatic_count,
    silhouette_score: clustering.silhouette_score,
    assignments,
    clusters
  }
}

/**
 * Next scatter_plot_options after choosing a cluster method from the toolbar.
 * Turning clustering on also shows regions and summary, and colors points by
 * cluster unless a color mode is already chosen; choosing natural tiers with
 * no count set starts at DEFAULT_NATURAL_TIER_COUNT; turning it off releases the
 * cluster color mode so points do not fall back to an uncolored state.
 *
 * @param {object} params
 * @param {object} params.scatter_plot_options
 * @param {string|null} params.cluster_method - 'k_means' | 'natural_breaks' | null
 * @returns {object}
 */
export const apply_cluster_method = ({
  scatter_plot_options,
  cluster_method
}) => {
  const next = { ...scatter_plot_options }
  if (!cluster_method) {
    delete next.cluster_method
    if (next.point_color_mode === 'cluster') delete next.point_color_mode
    return next
  }
  const was_off = !scatter_plot_options.cluster_method
  next.cluster_method = cluster_method
  if (cluster_method === 'natural_breaks' && next.cluster_count == null) {
    next.cluster_count = DEFAULT_NATURAL_TIER_COUNT
  }
  if (was_off) {
    next.show_cluster_regions = true
    next.show_cluster_summary = true
    if (!next.point_color_mode) next.point_color_mode = 'cluster'
  }
  return next
}

/**
 * Build the helper Highcharts series that communicate clusters. All are
 * appended after the points series (which must stay at index 0), carry a
 * stable id so Highcharts' one-to-one update matches them across toggles
 * rather than by shifting index, carry custom.cluster_index, and disable
 * mouse tracking. zIndex layers them:
 * regions (0) under halos (1) under the points series (2) under centroids (3).
 *
 * @param {object} params
 * @param {object[]} params.clusters - from derive_scatter_clusters
 * @param {number[]} params.x_values
 * @param {number[]} params.y_values
 * @param {number[]} params.assignments
 * @param {boolean} params.show_cluster_regions
 * @param {boolean} params.show_halos - ring each point in its cluster color
 * @param {number[]} [params.halo_radii] - per-point halo radius, so a ring
 *   hugs the marker drawn at that point; defaults to 10
 * @returns {object[]}
 */
export const build_cluster_series = ({
  clusters,
  x_values,
  y_values,
  assignments,
  show_cluster_regions,
  show_halos,
  halo_radii = []
}) => {
  const series = []

  if (show_cluster_regions) {
    clusters.forEach((cluster, cluster_index) => {
      if (cluster.hull.length < 3) return
      series.push({
        type: 'polygon',
        id: `cluster-region-${cluster_index}`,
        name: cluster.name,
        data: cluster.hull,
        color: hex_to_rgba(cluster.color, 0.12),
        lineColor: hex_to_rgba(cluster.color, 0.7),
        lineWidth: 1,
        enableMouseTracking: false,
        showInLegend: false,
        zIndex: 0,
        custom: { cluster_index }
      })
    })
  }

  if (show_halos) {
    clusters.forEach((cluster, cluster_index) => {
      const data = []
      assignments.forEach((assigned, index) => {
        if (assigned !== cluster_index) return
        data.push({
          x: x_values[index],
          y: y_values[index],
          marker: { radius: halo_radii[index] || 10 }
        })
      })
      series.push({
        type: 'scatter',
        name: `${cluster.name} halo`,
        id: `cluster-halo-${cluster_index}`,
        data,
        marker: {
          symbol: 'circle',
          fillColor: hex_to_rgba(cluster.color, 0.3),
          lineColor: cluster.color,
          lineWidth: 1.5
        },
        dataLabels: { enabled: false },
        enableMouseTracking: false,
        showInLegend: false,
        zIndex: 1,
        custom: { cluster_index }
      })
    })
  }

  if (show_cluster_regions) {
    clusters.forEach((cluster, cluster_index) => {
      series.push({
        type: 'scatter',
        name: `${cluster.name} centroid`,
        id: `cluster-centroid-${cluster_index}`,
        data: [[cluster.centroid_x, cluster.centroid_y]],
        marker: {
          symbol: 'diamond',
          radius: 7,
          fillColor: cluster.color,
          lineColor: '#ffffff',
          lineWidth: 1.5
        },
        dataLabels: {
          enabled: true,
          allowOverlap: true,
          align: 'left',
          verticalAlign: 'middle',
          x: 8,
          style: {
            color: cluster.color,
            fontSize: '11px',
            fontWeight: '700',
            textOutline: '2px #ffffff'
          },
          formatter: function () {
            return this.series.options.custom.cluster_name
          }
        },
        enableMouseTracking: false,
        showInLegend: false,
        zIndex: 3,
        custom: { cluster_index, cluster_name: cluster.name }
      })
    })
  }

  return series
}
