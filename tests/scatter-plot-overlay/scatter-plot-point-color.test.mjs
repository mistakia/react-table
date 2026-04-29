import { describe, expect, test } from 'bun:test'
import { resolve_point_color } from '../../src/scatter-plot-overlay/scatter-plot-point-color-utils.js'

describe('resolve_point_color', () => {
  test('returns color when point_color_mode is team and get_point_color resolves', () => {
    const row = { player_nfl_teams_0: 'KC' }
    const get_point_color = () => '#e31837'
    const color = resolve_point_color({
      row,
      point_color_mode: 'team',
      get_point_color
    })
    expect(color).toBe('#e31837')
  })

  test('returns color when point_color_mode is position and get_point_color resolves', () => {
    const row = { pos: 'QB' }
    const get_point_color = () => '#ff4040'
    const color = resolve_point_color({
      row,
      point_color_mode: 'position',
      get_point_color
    })
    expect(color).toBe('#ff4040')
  })

  test('returns undefined when point_color_mode is absent', () => {
    const row = { player_nfl_teams_0: 'KC' }
    const get_point_color = () => '#e31837'
    const color = resolve_point_color({
      row,
      point_color_mode: undefined,
      get_point_color
    })
    expect(color).toBeUndefined()
  })

  test('returns undefined when get_point_color is not provided', () => {
    const row = { player_nfl_teams_0: 'KC' }
    const color = resolve_point_color({
      row,
      point_color_mode: 'team',
      get_point_color: null
    })
    expect(color).toBeUndefined()
  })

  test('returns undefined when both point_color_mode and get_point_color are absent', () => {
    const row = { player_nfl_teams_0: 'KC' }
    const color = resolve_point_color({
      row,
      point_color_mode: undefined,
      get_point_color: null
    })
    expect(color).toBeUndefined()
  })

  test('returns undefined when get_point_color returns falsy', () => {
    const row = { pos: 'UNKNOWN' }
    const get_point_color = () => null
    const color = resolve_point_color({
      row,
      point_color_mode: 'position',
      get_point_color
    })
    expect(color).toBeUndefined()
  })
})
