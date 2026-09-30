/**
 * Dependency-free clustering primitives: seeded k-means, exact 1-D natural
 * breaks (Ckmeans.1d.dp), and silhouette-based cluster count selection.
 *
 * Every function is deterministic for a given input so the same view renders
 * the same clusters on every load.
 */

/**
 * mulberry32 pseudo-random generator.
 * @param {number} seed
 * @returns {() => number} generator returning floats in [0, 1)
 */
export const create_seeded_random = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Z-score a numeric array. A zero standard deviation maps every value to 0.
 * @param {number[]} values
 * @returns {{ values: number[], mean: number, std_dev: number }}
 */
export const standardize_values = (values) => {
  const count = values.length
  if (!count) return { values: [], mean: NaN, std_dev: NaN }
  const mean = values.reduce((sum, value) => sum + value, 0) / count
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count
  const std_dev = Math.sqrt(variance)
  return {
    values: values.map((value) => (std_dev ? (value - mean) / std_dev : 0)),
    mean,
    std_dev
  }
}

const squared_distance = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const delta = a[i] - b[i]
    sum += delta * delta
  }
  return sum
}

const compare_points = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

const initialize_centroids = ({ points, cluster_count, random }) => {
  const centroids = [points[Math.floor(random() * points.length)].slice()]
  const nearest = points.map((point) => squared_distance(point, centroids[0]))
  while (centroids.length < cluster_count) {
    const total = nearest.reduce((sum, distance) => sum + distance, 0)
    let chosen_index = 0
    if (total > 0) {
      let target = random() * total
      for (let i = 0; i < points.length; i++) {
        target -= nearest[i]
        if (target <= 0) {
          chosen_index = i
          break
        }
      }
    } else {
      chosen_index = Math.floor(random() * points.length)
    }
    const centroid = points[chosen_index].slice()
    centroids.push(centroid)
    for (let i = 0; i < points.length; i++) {
      nearest[i] = Math.min(nearest[i], squared_distance(points[i], centroid))
    }
  }
  return centroids
}

const run_k_means = ({ points, cluster_count, random, max_iterations }) => {
  const dimension = points[0].length
  const centroids = initialize_centroids({ points, cluster_count, random })
  const assignments = new Array(points.length).fill(-1)

  for (let iteration = 0; iteration < max_iterations; iteration++) {
    let changed = false
    for (let i = 0; i < points.length; i++) {
      let best_cluster = 0
      let best_distance = Infinity
      for (let c = 0; c < cluster_count; c++) {
        const distance = squared_distance(points[i], centroids[c])
        if (distance < best_distance) {
          best_distance = distance
          best_cluster = c
        }
      }
      if (assignments[i] !== best_cluster) {
        assignments[i] = best_cluster
        changed = true
      }
    }

    const sums = Array.from({ length: cluster_count }, () =>
      new Array(dimension).fill(0)
    )
    const counts = new Array(cluster_count).fill(0)
    for (let i = 0; i < points.length; i++) {
      counts[assignments[i]]++
      for (let d = 0; d < dimension; d++)
        sums[assignments[i]][d] += points[i][d]
    }

    for (let c = 0; c < cluster_count; c++) {
      if (counts[c]) {
        centroids[c] = sums[c].map((sum) => sum / counts[c])
        continue
      }
      // An emptied cluster takes the point farthest from its own centroid,
      // so every requested cluster ends with at least one member.
      let farthest_index = 0
      let farthest_distance = -1
      for (let i = 0; i < points.length; i++) {
        if (counts[assignments[i]] < 2) continue
        const distance = squared_distance(points[i], centroids[assignments[i]])
        if (distance > farthest_distance) {
          farthest_distance = distance
          farthest_index = i
        }
      }
      counts[assignments[farthest_index]]--
      assignments[farthest_index] = c
      counts[c] = 1
      centroids[c] = points[farthest_index].slice()
      changed = true
    }

    if (!changed) break
  }

  let inertia = 0
  for (let i = 0; i < points.length; i++) {
    inertia += squared_distance(points[i], centroids[assignments[i]])
  }
  return { assignments, centroids, inertia }
}

/**
 * Seeded k-means with k-means++ initialization; the lowest-inertia restart is
 * kept. Points are sorted before clustering so the result does not depend on
 * input order.
 *
 * @param {object} params
 * @param {number[][]} params.points - equal-length numeric vectors
 * @param {number} params.cluster_count
 * @param {number} [params.seed=1]
 * @param {number} [params.restart_count=8]
 * @param {number} [params.max_iterations=100]
 * @returns {{ assignments: number[], centroids: number[][], inertia: number } | null}
 *   null when there are fewer points than clusters
 */
export const cluster_k_means = ({
  points,
  cluster_count,
  seed = 1,
  restart_count = 8,
  max_iterations = 100
}) => {
  if (!points || !points.length || cluster_count < 1) return null
  if (points.length < cluster_count) return null

  const order = points.map((_, index) => index)
  order.sort((a, b) => compare_points(points[a], points[b]) || a - b)
  const sorted_points = order.map((index) => points[index])

  const random = create_seeded_random(seed)
  let best = null
  for (let restart = 0; restart < restart_count; restart++) {
    const result = run_k_means({
      points: sorted_points,
      cluster_count,
      random,
      max_iterations
    })
    if (!best || result.inertia < best.inertia) best = result
  }

  const assignments = new Array(points.length)
  order.forEach((original_index, sorted_index) => {
    assignments[original_index] = best.assignments[sorted_index]
  })
  return { assignments, centroids: best.centroids, inertia: best.inertia }
}

/**
 * Solve exact optimal 1-D clustering (Ckmeans.1d.dp) once for every count up
 * to max_count. The dynamic-programming table for max_count already holds
 * every smaller count, so automatic selection pays for one table, not one per
 * candidate count.
 *
 * @param {object} params
 * @param {number[]} params.values
 * @param {number} params.max_count
 * @returns {((cluster_count: number) => { assignments: number[], breaks: number[] } | null) | null}
 *   solver for any count from 1 to max_count; null when values are empty
 */
export const create_natural_breaks_solver = ({ values, max_count }) => {
  if (!values || !values.length || max_count < 1) return null

  const count = values.length
  const layer_count = Math.min(max_count, count)
  const order = values.map((_, index) => index)
  order.sort((a, b) => values[a] - values[b] || a - b)
  const sorted = order.map((index) => values[index])

  const prefix_sum = new Float64Array(count + 1)
  const prefix_square_sum = new Float64Array(count + 1)
  for (let i = 0; i < count; i++) {
    prefix_sum[i + 1] = prefix_sum[i] + sorted[i]
    prefix_square_sum[i + 1] = prefix_square_sum[i] + sorted[i] * sorted[i]
  }
  // Within-cluster sum of squares for sorted[start..end] inclusive.
  const segment_cost = (start, end) => {
    const size = end - start + 1
    const sum = prefix_sum[end + 1] - prefix_sum[start]
    const square_sum = prefix_square_sum[end + 1] - prefix_square_sum[start]
    return Math.max(0, square_sum - (sum * sum) / size)
  }

  // cost[k][i]: best cost of splitting sorted[0..i] into k + 1 clusters;
  // split[k][i]: start index of the last of those clusters.
  const cost = Array.from({ length: layer_count }, () =>
    new Float64Array(count).fill(Infinity)
  )
  const split = Array.from({ length: layer_count }, () => new Int32Array(count))
  for (let i = 0; i < count; i++) cost[0][i] = segment_cost(0, i)
  for (let k = 1; k < layer_count; k++) {
    for (let i = k; i < count; i++) {
      for (let j = k; j <= i; j++) {
        const candidate = cost[k - 1][j - 1] + segment_cost(j, i)
        if (candidate < cost[k][i]) {
          cost[k][i] = candidate
          split[k][i] = j
        }
      }
    }
  }

  return (cluster_count) => {
    if (cluster_count < 1 || cluster_count > layer_count) return null
    const sorted_assignments = new Array(count)
    const breaks = []
    let end = count - 1
    for (let k = cluster_count - 1; k >= 0; k--) {
      const start = k === 0 ? 0 : split[k][end]
      for (let i = start; i <= end; i++) sorted_assignments[i] = k
      if (k > 0) breaks.unshift(sorted[start])
      end = start - 1
    }
    const assignments = new Array(count)
    order.forEach((original_index, sorted_index) => {
      assignments[original_index] = sorted_assignments[sorted_index]
    })
    return { assignments, breaks }
  }
}

/**
 * Exact optimal 1-D clustering minimizing within-cluster sum of squares
 * (Ckmeans.1d.dp). Cluster indices ascend with value.
 *
 * @param {object} params
 * @param {number[]} params.values
 * @param {number} params.cluster_count
 * @returns {{ assignments: number[], breaks: number[] } | null}
 *   breaks holds the minimum value of each cluster after the first
 */
export const cluster_natural_breaks = ({ values, cluster_count }) => {
  if (!values || values.length < cluster_count) return null
  const solve = create_natural_breaks_solver({
    values,
    max_count: cluster_count
  })
  return solve ? solve(cluster_count) : null
}

// The silhouette is O(n^2); past this many points it is scored on a strided
// sample, which keeps automatic selection near 100 ms at a 2000-row view.
export const SILHOUETTE_SAMPLE_SIZE = 600

/**
 * Mean silhouette coefficient over all points (or a strided sample of
 * sample_size points when there are more). Points in singleton clusters
 * contribute 0. Returns NaN when fewer than two clusters are populated.
 *
 * @param {object} params
 * @param {number[][]} params.points
 * @param {number[]} params.assignments
 * @param {number} [params.sample_size=SILHOUETTE_SAMPLE_SIZE]
 * @returns {number}
 */
export const compute_silhouette_score = ({
  points,
  assignments,
  sample_size = SILHOUETTE_SAMPLE_SIZE
}) => {
  if (points.length > sample_size) {
    // Evenly strided sample, so the score stays deterministic.
    const stride = points.length / sample_size
    const sample_indexes = Array.from({ length: sample_size }, (_, i) =>
      Math.floor(i * stride)
    )
    return compute_silhouette_score({
      points: sample_indexes.map((index) => points[index]),
      assignments: sample_indexes.map((index) => assignments[index]),
      sample_size
    })
  }
  const cluster_ids = [...new Set(assignments)]
  if (cluster_ids.length < 2) return NaN
  const cluster_count = Math.max(...cluster_ids) + 1
  const sizes = new Array(cluster_count).fill(0)
  assignments.forEach((cluster) => sizes[cluster]++)

  let total = 0
  const distance_sums = new Array(cluster_count)
  for (let i = 0; i < points.length; i++) {
    distance_sums.fill(0)
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      distance_sums[assignments[j]] += Math.sqrt(
        squared_distance(points[i], points[j])
      )
    }
    const own = assignments[i]
    if (sizes[own] < 2) continue
    const cohesion = distance_sums[own] / (sizes[own] - 1)
    let separation = Infinity
    for (let c = 0; c < cluster_count; c++) {
      if (c === own || !sizes[c]) continue
      separation = Math.min(separation, distance_sums[c] / sizes[c])
    }
    const denominator = Math.max(cohesion, separation)
    total += denominator ? (separation - cohesion) / denominator : 0
  }
  return total / points.length
}

/**
 * Pick the cluster count with the highest silhouette score.
 *
 * @param {object} params
 * @param {number[][]} params.points - vectors the silhouette is measured in
 * @param {(cluster_count: number) => { assignments: number[] } | null} params.cluster_fn
 * @param {number} [params.min_count=2]
 * @param {number} [params.max_count=8]
 * @returns {{ cluster_count: number, result: object, silhouette_score: number } | null}
 */
export const select_cluster_count = ({
  points,
  cluster_fn,
  min_count = 2,
  max_count = 8
}) => {
  const upper = Math.min(max_count, Math.floor(points.length / 2))
  let best = null
  for (let cluster_count = min_count; cluster_count <= upper; cluster_count++) {
    const result = cluster_fn(cluster_count)
    if (!result) continue
    const silhouette_score = compute_silhouette_score({
      points,
      assignments: result.assignments
    })
    if (!isFinite(silhouette_score)) continue
    if (!best || silhouette_score > best.silhouette_score) {
      best = { cluster_count, result, silhouette_score }
    }
  }
  return best
}
