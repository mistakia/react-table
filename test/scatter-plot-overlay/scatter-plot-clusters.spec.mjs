import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  apply_cluster_method,
  build_cluster_series,
  CLUSTER_PALETTE,
  compute_convex_hull,
  derive_scatter_clusters
} from '../../src/scatter-plot-overlay/scatter-plot-clusters.js'

// Three cohorts shaped like rest-of-season points against age: young high
// scorers, veteran high scorers, and a low-scoring middle group.
const x_values = [22, 22.5, 23, 23.5, 31, 31.5, 32, 32.5, 27, 27.5, 28, 28.5]
const y_values = [200, 210, 205, 215, 190, 200, 195, 185, 40, 50, 45, 55]

const derive = (options, extra = {}) =>
  derive_scatter_clusters({
    x_values,
    y_values,
    x_label: 'Age',
    y_label: 'Points',
    scatter_plot_options: options,
    ...extra
  })

describe('compute_convex_hull', () => {
  it('returns the corners of a square and drops interior points', () => {
    const hull = compute_convex_hull([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [1, 1],
      [1, 0]
    ])
    expect(hull).to.have.deep.members([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2]
    ])
    expect(hull).to.have.lengthOf(4)
  })

  it('returns the unique points when fewer than three', () => {
    expect(
      compute_convex_hull([
        [1, 1],
        [1, 1],
        [2, 2]
      ])
    ).to.deep.equal([
      [1, 1],
      [2, 2]
    ])
  })
})

describe('derive_scatter_clusters', () => {
  it('returns null when clustering is off', () => {
    expect(derive({})).to.equal(null)
    expect(derive({ cluster_method: null })).to.equal(null)
  })

  it('returns null with too few points for the requested count', () => {
    expect(
      derive_scatter_clusters({
        x_values: [1, 2, 3],
        y_values: [1, 2, 3],
        scatter_plot_options: { cluster_method: 'k_means', cluster_count: 2 }
      })
    ).to.equal(null)
  })

  it('k-means finds the three cohorts with every cluster populated', () => {
    const result = derive({ cluster_method: 'k_means', cluster_count: 3 })
    expect(result.cluster_count).to.equal(3)
    expect(result.clusters.map((cluster) => cluster.count)).to.deep.equal([
      4, 4, 4
    ])
    expect(result.assignments).to.have.lengthOf(x_values.length)
    expect(result.silhouette_score).to.be.greaterThan(0.5)
    expect(result.clusters[0].color).to.equal(CLUSTER_PALETTE[0])
  })

  it('automatic count selects three cohorts', () => {
    const result = derive({ cluster_method: 'k_means', cluster_count: null })
    expect(result.cluster_count).to.equal(3)
    expect(result.is_automatic_count).to.equal(true)
  })

  it('orders best-first and flips when the x axis is reversed', () => {
    const normal = derive({ cluster_method: 'k_means', cluster_count: 3 })
    const reversed = derive(
      { cluster_method: 'k_means', cluster_count: 3 },
      { x_reversed: true }
    )
    // Higher age scores better when not reversed: veterans lead.
    expect(normal.clusters[0].centroid_x).to.be.closeTo(31.75, 1e-9)
    // Lower age scores better when reversed: young high scorers lead.
    expect(reversed.clusters[0].centroid_x).to.be.closeTo(22.75, 1e-9)
    expect(reversed.clusters[2].centroid_y).to.be.closeTo(47.5, 1e-9)
  })

  it('names k-means clusters from centroid levels', () => {
    const result = derive(
      { cluster_method: 'k_means', cluster_count: 3 },
      { x_reversed: true }
    )
    expect(result.clusters.map((cluster) => cluster.name)).to.deep.equal([
      'Low Age · High Points',
      'High Age · High Points',
      'Mid Age · Low Points'
    ])
  })

  it('names natural-breaks tiers best-first and applies custom names by position', () => {
    const result = derive(
      {
        cluster_method: 'natural_breaks',
        natural_breaks_axis: 'y',
        cluster_count: 2,
        cluster_names: [null, 'Depth']
      },
      { x_reversed: true }
    )
    expect(result.clusters.map((cluster) => cluster.name)).to.deep.equal([
      'Tier 1',
      'Depth'
    ])
    expect(result.clusters[0].count).to.equal(8)
    expect(result.natural_breaks_axis).to.equal('y')
  })

  it('suffixes duplicate automatic names', () => {
    const result = derive_scatter_clusters({
      x_values: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7],
      y_values: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7],
      x_label: 'X',
      y_label: 'Y',
      scatter_plot_options: { cluster_method: 'k_means', cluster_count: 4 }
    })
    const names = result.clusters.map((cluster) => cluster.name)
    expect(new Set(names).size).to.equal(names.length)
  })
})

describe('build_cluster_series', () => {
  const result = derive({ cluster_method: 'k_means', cluster_count: 3 })

  it('emits regions, halos, and centroids tagged with cluster_index', () => {
    const series = build_cluster_series({
      clusters: result.clusters,
      x_values,
      y_values,
      assignments: result.assignments,
      show_cluster_regions: true,
      show_halos: true
    })
    expect(series.filter((item) => item.type === 'polygon')).to.have.lengthOf(3)
    expect(series).to.have.lengthOf(9)
    expect(new Set(series.map((item) => item.id)).size).to.equal(9)
    series.forEach((item) => {
      expect(item.custom.cluster_index).to.be.a('number')
      expect(item.enableMouseTracking).to.equal(false)
    })
    const halo_points = series
      .filter((item) => item.name.endsWith('halo'))
      .reduce((sum, item) => sum + item.data.length, 0)
    expect(halo_points).to.equal(x_values.length)
  })

  it('sizes each halo from its per-point radius', () => {
    const halo_radii = x_values.map((_, index) => index + 4)
    const series = build_cluster_series({
      clusters: result.clusters,
      x_values,
      y_values,
      assignments: result.assignments,
      show_cluster_regions: false,
      show_halos: true,
      halo_radii
    })
    const radius_by_x = new Map()
    series.forEach((item) =>
      item.data.forEach((point) =>
        radius_by_x.set(point.x, point.marker.radius)
      )
    )
    x_values.forEach((x, index) =>
      expect(radius_by_x.get(x)).to.equal(halo_radii[index])
    )
  })

  it('skips hulls for clusters under three points', () => {
    const series = build_cluster_series({
      clusters: [
        {
          ...result.clusters[0],
          hull: [
            [1, 1],
            [2, 2]
          ]
        }
      ],
      x_values,
      y_values,
      assignments: result.assignments,
      show_cluster_regions: true,
      show_halos: false
    })
    expect(series.map((item) => item.type)).to.deep.equal(['scatter'])
  })

  it('emits nothing when regions and halos are off', () => {
    expect(
      build_cluster_series({
        clusters: result.clusters,
        x_values,
        y_values,
        assignments: result.assignments,
        show_cluster_regions: false,
        show_halos: false
      })
    ).to.deep.equal([])
  })
})

describe('apply_cluster_method', () => {
  it('turning on enables regions, summary, and cluster color when no color mode is set', () => {
    expect(
      apply_cluster_method({
        scatter_plot_options: { show_tier_grid: true },
        cluster_method: 'k_means'
      })
    ).to.deep.equal({
      show_tier_grid: true,
      cluster_method: 'k_means',
      show_cluster_regions: true,
      show_cluster_summary: true,
      point_color_mode: 'cluster'
    })
  })

  it('choosing natural tiers without a count starts at five', () => {
    expect(
      apply_cluster_method({
        scatter_plot_options: { cluster_method: 'k_means' },
        cluster_method: 'natural_breaks'
      }).cluster_count
    ).to.equal(5)
    expect(
      apply_cluster_method({
        scatter_plot_options: { cluster_count: 3 },
        cluster_method: 'natural_breaks'
      }).cluster_count
    ).to.equal(3)
    expect(
      apply_cluster_method({
        scatter_plot_options: {},
        cluster_method: 'k_means'
      })
    ).to.not.have.property('cluster_count')
  })

  it('turning on keeps an existing color mode', () => {
    const next = apply_cluster_method({
      scatter_plot_options: { point_color_mode: 'team' },
      cluster_method: 'natural_breaks'
    })
    expect(next.point_color_mode).to.equal('team')
  })

  it('switching methods leaves display choices alone', () => {
    const next = apply_cluster_method({
      scatter_plot_options: {
        cluster_method: 'k_means',
        show_cluster_regions: false
      },
      cluster_method: 'natural_breaks'
    })
    expect(next.show_cluster_regions).to.equal(false)
    expect(next.point_color_mode).to.equal(undefined)
  })

  it('turning off clears the method and the cluster color mode only', () => {
    expect(
      apply_cluster_method({
        scatter_plot_options: {
          cluster_method: 'k_means',
          point_color_mode: 'cluster',
          cluster_count: 3
        },
        cluster_method: null
      })
    ).to.deep.equal({ cluster_count: 3 })
    expect(
      apply_cluster_method({
        scatter_plot_options: {
          cluster_method: 'k_means',
          point_color_mode: 'position'
        },
        cluster_method: null
      }).point_color_mode
    ).to.equal('position')
  })
})
