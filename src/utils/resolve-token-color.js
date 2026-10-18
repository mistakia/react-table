// A --rt-* colour token as the rgb()/rgba() string the page gives it now. A
// stylesheet reads a token as var(), but a library that parses colours itself
// -- Highcharts -- cannot, so a chart resolves each token at render and has to
// render again when the host's theme changes (use-host-theme.js).
//
// The token is resolved through a probe element rather than read raw, because
// a host may set it to a var() or a color-mix() of its own roles, and only the
// browser can turn those into a colour. Without a document (SSR), or where the
// token is unset or the DOM computes no colour (a test DOM), the fallback is
// returned instead, so a chart always gets the lib's default.

let probe = null

// Chrome serializes a mix as `color(srgb r g b / a)` with 0-1 channels, which
// Highcharts cannot parse, so the result is rewritten as rgb()/rgba().
const to_rgb_string = (value) => {
  const match = value.match(
    /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/
  )
  if (!match) return value
  const [r, g, b] = match
    .slice(1, 4)
    .map((channel) => Math.round(Number(channel) * 255))
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  return alpha === 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const parse_channels = (color) => {
  const hex = color.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const value = parseInt(hex[1], 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 1]
  }
  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/
  )
  if (rgb) {
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      rgb[4] === undefined ? 1 : Number(rgb[4])
    ]
  }
  return null
}

// The colour at an opacity, as rgba(). Takes a #rrggbb or an rgb()/rgba()
// string; an already translucent colour has its alpha multiplied. Anything else
// is returned unchanged rather than guessed at.
export const with_alpha = (color, alpha) => {
  const channels = parse_channels(color)
  if (!channels) return color
  const [r, g, b, a] = channels
  const combined = Math.round(a * alpha * 1000) / 1000
  return `rgba(${r}, ${g}, ${b}, ${combined})`
}

export const resolve_token_color = (name, fallback, { alpha = null } = {}) => {
  const apply = (color) => (alpha === null ? color : with_alpha(color, alpha))
  if (typeof document === 'undefined' || !document.documentElement) {
    return apply(fallback)
  }
  const root = document.documentElement
  if (!getComputedStyle(root).getPropertyValue(name).trim()) {
    return apply(fallback)
  }
  if (!probe || !probe.isConnected) {
    probe = document.createElement('span')
    probe.style.display = 'none'
    root.appendChild(probe)
  }
  probe.style.color = ''
  probe.style.color = `var(${name})`
  const resolved = to_rgb_string(getComputedStyle(probe).color || '')
  return apply(parse_channels(resolved) ? resolved : fallback)
}
