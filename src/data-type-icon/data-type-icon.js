import React from 'react'
import PropTypes from 'prop-types'
import ShortTextIcon from '@mui/icons-material/ShortText'
import NumbersIcon from '@mui/icons-material/Numbers'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import DataObjectIcon from '@mui/icons-material/DataObject'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FingerprintIcon from '@mui/icons-material/Fingerprint'

import { TABLE_DATA_TYPES } from '../constants.mjs'

export default function DataTypeIcon({ data_type }) {
  switch (data_type) {
    case TABLE_DATA_TYPES.NUMBER:
      return <NumbersIcon />
    case TABLE_DATA_TYPES.TEXT:
      return <ShortTextIcon />
    case TABLE_DATA_TYPES.BOOLEAN:
      return <CheckBoxIcon />
    case TABLE_DATA_TYPES.JSON:
      return <DataObjectIcon />
    case TABLE_DATA_TYPES.DATE:
      return <CalendarMonthIcon />
    case TABLE_DATA_TYPES.BINARY_UUID:
      return <FingerprintIcon />
    default:
      return null
  }
}

DataTypeIcon.propTypes = {
  data_type: PropTypes.number
}
