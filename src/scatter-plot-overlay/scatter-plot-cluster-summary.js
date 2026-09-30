import React from 'react'
import PropTypes from 'prop-types'

const METHOD_LABELS = {
  k_means: 'k-means on standardized X and Y',
  natural_breaks: 'Natural breaks'
}

const AXIS_LABELS = {
  x: 'X',
  y: 'Y',
  combined: 'combined X and Y'
}

const format_number = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : '-'

// Doubles as the chart legend: the Highcharts legend stays disabled so the
// helper series never appear as toggleable entries.
const ScatterPlotClusterSummary = ({ cluster_result, x_label, y_label }) => {
  const {
    method,
    natural_breaks_axis,
    cluster_count,
    is_automatic_count,
    silhouette_score,
    clusters
  } = cluster_result

  const method_label =
    method === 'natural_breaks'
      ? `${METHOD_LABELS.natural_breaks} along ${AXIS_LABELS[natural_breaks_axis]}`
      : METHOD_LABELS[method]

  return (
    <div className='cluster-summary'>
      <h4 className='regression-stats-title'>Groups</h4>
      <table className='cluster-summary-table'>
        <thead>
          <tr>
            <th>Group</th>
            <th>Count</th>
            <th>{x_label}</th>
            <th>{y_label}</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr key={cluster.color}>
              <td>
                <span
                  className='cluster-summary-swatch'
                  style={{ backgroundColor: cluster.color }}
                />
                {cluster.name}
              </td>
              <td>{cluster.count}</td>
              <td>
                {format_number(cluster.centroid_x)} ±{' '}
                {format_number(cluster.x_spread)}
              </td>
              <td>
                {format_number(cluster.centroid_y)} ±{' '}
                {format_number(cluster.y_spread)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className='cluster-summary-footer'>
        {method_label} · {cluster_count} groups
        {is_automatic_count ? ' (chosen automatically)' : ''} · silhouette{' '}
        {Number.isFinite(silhouette_score) ? silhouette_score.toFixed(2) : '-'}
        {' · values are group mean ± standard deviation'}
      </p>
    </div>
  )
}

ScatterPlotClusterSummary.propTypes = {
  cluster_result: PropTypes.shape({
    method: PropTypes.string.isRequired,
    natural_breaks_axis: PropTypes.string,
    cluster_count: PropTypes.number.isRequired,
    is_automatic_count: PropTypes.bool.isRequired,
    silhouette_score: PropTypes.number,
    clusters: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired,
        centroid_x: PropTypes.number.isRequired,
        centroid_y: PropTypes.number.isRequired,
        x_spread: PropTypes.number.isRequired,
        y_spread: PropTypes.number.isRequired
      })
    ).isRequired
  }).isRequired,
  x_label: PropTypes.string.isRequired,
  y_label: PropTypes.string.isRequired
}

export default ScatterPlotClusterSummary
