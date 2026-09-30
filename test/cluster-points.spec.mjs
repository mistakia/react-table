import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  cluster_k_means,
  cluster_natural_breaks,
  compute_silhouette_score,
  create_natural_breaks_solver,
  create_seeded_random,
  select_cluster_count,
  standardize_values
} from '../src/utils/cluster-points.js'

const make_blobs = ({ centers, per_blob, spread, seed }) => {
  const random = create_seeded_random(seed)
  const points = []
  const labels = []
  centers.forEach(([cx, cy], label) => {
    for (let i = 0; i < per_blob; i++) {
      points.push([
        cx + (random() - 0.5) * spread,
        cy + (random() - 0.5) * spread
      ])
      labels.push(label)
    }
  })
  return { points, labels }
}

// Two assignments describe the same partition when a one-to-one relabeling
// maps one onto the other.
const is_same_partition = (a, b) => {
  const forward = new Map()
  const backward = new Map()
  for (let i = 0; i < a.length; i++) {
    if (forward.has(a[i]) && forward.get(a[i]) !== b[i]) return false
    if (backward.has(b[i]) && backward.get(b[i]) !== a[i]) return false
    forward.set(a[i], b[i])
    backward.set(b[i], a[i])
  }
  return true
}

const shuffle = (items, seed) => {
  const random = create_seeded_random(seed)
  const order = items.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

const blobs = make_blobs({
  centers: [
    [0, 0],
    [10, 10],
    [0, 10]
  ],
  per_blob: 30,
  spread: 2,
  seed: 7
})

describe('standardize_values', () => {
  it('returns z-scores with mean 0 and unit deviation', () => {
    const { values, mean, std_dev } = standardize_values([
      2, 4, 4, 4, 5, 5, 7, 9
    ])
    expect(mean).to.equal(5)
    expect(std_dev).to.equal(2)
    expect(values[0]).to.equal(-1.5)
  })

  it('maps constant input to zeros', () => {
    expect(standardize_values([3, 3, 3]).values).to.deep.equal([0, 0, 0])
  })
})

describe('cluster_k_means', () => {
  it('recovers three well-separated blobs', () => {
    const result = cluster_k_means({ points: blobs.points, cluster_count: 3 })
    expect(is_same_partition(result.assignments, blobs.labels)).to.equal(true)
  })

  it('is independent of input order', () => {
    const order = shuffle(blobs.points, 3)
    const shuffled = order.map((index) => blobs.points[index])
    const original = cluster_k_means({ points: blobs.points, cluster_count: 4 })
    const reordered = cluster_k_means({ points: shuffled, cluster_count: 4 })
    const restored = new Array(order.length)
    order.forEach((original_index, shuffled_index) => {
      restored[original_index] = reordered.assignments[shuffled_index]
    })
    expect(restored).to.deep.equal(original.assignments)
  })

  it('never leaves a cluster empty for counts 2 through 8', () => {
    // An empty cluster would mean seeding or empty-cluster repair is broken.
    const random = create_seeded_random(11)
    const points = Array.from({ length: 200 }, () => [random(), random()])
    for (let cluster_count = 2; cluster_count <= 8; cluster_count++) {
      const { assignments } = cluster_k_means({ points, cluster_count })
      expect(new Set(assignments).size).to.equal(cluster_count)
    }
  })

  it('returns null when there are fewer points than clusters', () => {
    expect(cluster_k_means({ points: [[1, 1]], cluster_count: 2 })).to.equal(
      null
    )
  })
})

describe('cluster_natural_breaks', () => {
  it('finds the optimal breaks in a known series', () => {
    const values = [1, 2, 3, 20, 21, 22, 50, 51]
    const { assignments, breaks } = cluster_natural_breaks({
      values,
      cluster_count: 3
    })
    expect(assignments).to.deep.equal([0, 0, 0, 1, 1, 1, 2, 2])
    expect(breaks).to.deep.equal([20, 50])
  })

  it('assigns in original input order', () => {
    const { assignments } = cluster_natural_breaks({
      values: [50, 1, 21, 2],
      cluster_count: 3
    })
    expect(assignments).to.deep.equal([2, 0, 1, 0])
  })

  it('never leaves a cluster empty', () => {
    const random = create_seeded_random(5)
    const values = Array.from({ length: 120 }, () => random() * 100)
    for (let cluster_count = 2; cluster_count <= 8; cluster_count++) {
      const { assignments } = cluster_natural_breaks({ values, cluster_count })
      expect(new Set(assignments).size).to.equal(cluster_count)
    }
  })
})

describe('compute_silhouette_score', () => {
  it('scores separated blobs near 1 and a single cluster as NaN', () => {
    const score = compute_silhouette_score({
      points: blobs.points,
      assignments: blobs.labels
    })
    expect(score).to.be.greaterThan(0.8)
    expect(
      compute_silhouette_score({
        points: blobs.points,
        assignments: blobs.labels.map(() => 0)
      })
    ).to.be.NaN
  })
})

describe('select_cluster_count', () => {
  it('picks three for three blobs', () => {
    const selection = select_cluster_count({
      points: blobs.points,
      cluster_fn: (cluster_count) =>
        cluster_k_means({ points: blobs.points, cluster_count })
    })
    expect(selection.cluster_count).to.equal(3)
  })

  it('caps the count at half the points', () => {
    const points = [[0], [1], [10], [11], [20]]
    const tried = []
    select_cluster_count({
      points,
      cluster_fn: (cluster_count) => {
        tried.push(cluster_count)
        return cluster_natural_breaks({
          values: points.map(([value]) => value),
          cluster_count
        })
      }
    })
    expect(tried).to.deep.equal([2])
  })
})

describe('create_natural_breaks_solver', () => {
  it('matches a fresh solve for every count from one shared table', () => {
    const random = create_seeded_random(9)
    const values = Array.from({ length: 60 }, () => random() * 50)
    const solve = create_natural_breaks_solver({ values, max_count: 8 })
    for (let cluster_count = 1; cluster_count <= 8; cluster_count++) {
      expect(solve(cluster_count)).to.deep.equal(
        cluster_natural_breaks({ values, cluster_count })
      )
    }
    expect(solve(9)).to.equal(null)
  })
})

describe('compute_silhouette_score sampling', () => {
  it('scores a strided sample deterministically past the sample size', () => {
    const big = make_blobs({
      centers: [
        [0, 0],
        [10, 10]
      ],
      per_blob: 400,
      spread: 2,
      seed: 4
    })
    const first = compute_silhouette_score({
      points: big.points,
      assignments: big.labels,
      sample_size: 100
    })
    const second = compute_silhouette_score({
      points: big.points,
      assignments: big.labels,
      sample_size: 100
    })
    const full = compute_silhouette_score({
      points: big.points,
      assignments: big.labels,
      sample_size: Infinity
    })
    expect(first).to.equal(second)
    expect(first).to.be.closeTo(full, 0.02)
  })
})
