import { describe, it } from 'mocha'
import { expect } from 'chai'

import { build_scatter_data_labels } from '../../src/scatter-plot-overlay/scatter-plot-data-labels.js'

describe('scatter-plot-overlay label suffix (S9)', () => {
  it('formatter appends suffix when get_scatter_point_label_suffix is provided', () => {
    const row = { year: 2022 }
    const get_scatter_point_label_suffix = () => ' (2022)'
    const opts = build_scatter_data_labels({
      labels_enabled: true,
      get_scatter_point_label_suffix
    })
    const result = opts.formatter.call({
      point: {
        is_outlier: true,
        label: 'Amari Cooper',
        options: { original_data: row }
      }
    })
    expect(result).to.equal('Amari Cooper (2022)')
  })

  it('formatter label is unchanged when get_scatter_point_label_suffix is absent', () => {
    const opts = build_scatter_data_labels({ labels_enabled: true })
    const result = opts.formatter.call({
      point: {
        is_outlier: true,
        label: 'Amari Cooper',
        options: { original_data: {} }
      }
    })
    expect(result).to.equal('Amari Cooper')
  })

  it('formatter returns null for non-outlier regardless of suffix', () => {
    const get_scatter_point_label_suffix = () => ' (2022)'
    const opts = build_scatter_data_labels({
      labels_enabled: true,
      get_scatter_point_label_suffix
    })
    const result = opts.formatter.call({
      point: {
        is_outlier: false,
        label: 'Amari Cooper',
        options: { original_data: {} }
      }
    })
    expect(result).to.equal(null)
  })

  it('formatter treats empty-string suffix as no suffix', () => {
    const get_scatter_point_label_suffix = () => ''
    const opts = build_scatter_data_labels({
      labels_enabled: true,
      get_scatter_point_label_suffix
    })
    const result = opts.formatter.call({
      point: {
        is_outlier: true,
        label: 'Amari Cooper',
        options: { original_data: {} }
      }
    })
    expect(result).to.equal('Amari Cooper')
  })

  it('formatter appends week suffix with leading space', () => {
    const row = { year: 2022, week: 5 }
    const get_scatter_point_label_suffix = (r) => ` (${r.year} W${r.week})`
    const opts = build_scatter_data_labels({
      labels_enabled: true,
      get_scatter_point_label_suffix
    })
    const result = opts.formatter.call({
      point: {
        is_outlier: true,
        label: 'Amari Cooper',
        options: { original_data: row }
      }
    })
    expect(result).to.equal('Amari Cooper (2022 W5)')
  })
})
