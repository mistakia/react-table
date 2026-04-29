import React from 'react'
import PropTypes from 'prop-types'

const range_shape = PropTypes.shape({
  offset: PropTypes.number.isRequired,
  length: PropTypes.number.isRequired
})

const normalize_ranges = (ranges, text_length) => {
  if (!Array.isArray(ranges) || ranges.length === 0) return []

  const cleaned = []
  for (const range of ranges) {
    if (!range) continue
    const offset = Math.max(0, range.offset | 0)
    const length = Math.max(0, range.length | 0)
    if (offset >= text_length || length === 0) continue
    const end = Math.min(text_length, offset + length)
    cleaned.push({ start: offset, end })
  }
  if (cleaned.length === 0) return []

  cleaned.sort((a, b) => a.start - b.start || a.end - b.end)

  const merged = [cleaned[0]]
  for (let i = 1; i < cleaned.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = cleaned[i]
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end)
    } else {
      merged.push(curr)
    }
  }
  return merged
}

const HighlightedText = ({ text, ranges, className = 'highlight' }) => {
  const text_value = text == null ? '' : String(text)
  const normalized = normalize_ranges(ranges, text_value.length)
  if (normalized.length === 0) return <>{text_value}</>

  const segments = []
  let cursor = 0
  normalized.forEach(({ start, end }, idx) => {
    if (start > cursor) {
      segments.push(
        <React.Fragment key={`p${idx}`}>
          {text_value.slice(cursor, start)}
        </React.Fragment>
      )
    }
    segments.push(
      <span key={`h${idx}`} className={className}>
        {text_value.slice(start, end)}
      </span>
    )
    cursor = end
  })
  if (cursor < text_value.length) {
    segments.push(
      <React.Fragment key='tail'>{text_value.slice(cursor)}</React.Fragment>
    )
  }
  return <>{segments}</>
}

HighlightedText.propTypes = {
  text: PropTypes.string,
  ranges: PropTypes.arrayOf(range_shape),
  className: PropTypes.string
}

export default React.memo(HighlightedText)
