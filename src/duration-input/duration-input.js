// The text input for a DURATION filter value. The user types `90m`, `4h`,
// `2d` or `0`; the committed value is minutes. An entry outside that grammar
// is marked invalid and never committed, and emptying the box commits null.
//
// The draft re-seeds from the committed minutes only when it does not already
// mean them, so typing `60m` is not rewritten to `1h` under the cursor while
// clearing the filter elsewhere still empties the box.

import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import TextField from '@mui/material/TextField'

import {
  parse_duration_minutes,
  format_duration_minutes
} from '#src/utils/duration-minutes.mjs'

const committed_minutes = (value) =>
  value === undefined || value === null || value === '' ? null : Number(value)

export default function DurationInput({
  label,
  placeholder,
  className,
  committed_value,
  on_commit
}) {
  const [draft, set_draft] = useState(format_duration_minutes(committed_value))

  useEffect(() => {
    set_draft((current) => {
      const draft_minutes =
        current.trim() === '' ? null : parse_duration_minutes(current)
      return draft_minutes === committed_minutes(committed_value)
        ? current
        : format_duration_minutes(committed_value)
    })
  }, [committed_value])

  const is_invalid =
    draft.trim() !== '' && parse_duration_minutes(draft) === null

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      className={className}
      size='small'
      variant='outlined'
      value={draft}
      error={is_invalid}
      title='A whole number with m, h or d, such as 90m, 4h or 2d'
      onChange={(event) => {
        const text = event.target.value
        set_draft(text)
        if (text.trim() === '') return on_commit(null)
        const minutes = parse_duration_minutes(text)
        if (minutes !== null) on_commit(minutes)
      }}
    />
  )
}

DurationInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  committed_value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  on_commit: PropTypes.func.isRequired
}
