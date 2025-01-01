import React from 'react'
import { format } from 'timeago.js'

import PropTypes from 'prop-types'

import './table-metadata.styl'

export default function TableMetadata({ created_at }) {
  if (!created_at) return null

  const fifteen_minutes = 15 * 60 * 1000
  const time_diff = Date.now() - created_at

  if (time_diff < fifteen_minutes) return null

  return (
    <div className='table-metadata'>
      View calculated {format(created_at)} (
      {new Date(created_at).toLocaleString()})
    </div>
  )
}

TableMetadata.propTypes = {
  created_at: PropTypes.number
}
