import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import Button from '@mui/material/Button'
import dayjs from 'dayjs'

import FilterBase from '#src/filter-base'
import { format_column_params } from '#src/utils/format-column-params.js'

export default function ColumnParamDateFilter({
  column_param_name,
  column_param_definition,
  selected_param_values,
  handle_change = () => {},
  mixed_state = false
}) {
  const label = column_param_definition?.label || column_param_name
  const datepicker_props = column_param_definition?.datepicker_props || {}
  const default_label = column_param_definition?.default_label || ''
  // The picker's calendar popup is a MUI surface pinned to theme.zIndex.modal
  // (1300), but it opens FROM inside this filter's popper, which sits at
  // --rt-z-popper. A host that rebases --rt-z-base above MUI's modal layer
  // (this lib's documented use of the override) would otherwise render the
  // calendar behind the input panel. Pin the popup to the lib's scale, one rung
  // above the popper it opens from, so it tracks the host's rebase.
  const datepicker_slot_props = datepicker_props.slotProps || {}
  const datepicker_popper_style = {
    ...(datepicker_slot_props.popper?.style || {}),
    zIndex: 'calc(var(--rt-z-popper) + 1)'
  }
  const datepicker_merged_slot_props = {
    ...datepicker_slot_props,
    popper: {
      ...datepicker_slot_props.popper,
      style: datepicker_popper_style
    }
  }
  const [value, set_value] = useState(
    selected_param_values
      ? dayjs(selected_param_values)
      : column_param_definition.default_value
        ? dayjs(column_param_definition.default_value)
        : null
  )
  const [trigger_close, set_trigger_close] = useState(null)

  const handle_set = () => {
    handle_change(value ? value.format('YYYY-MM-DD') : null)
  }

  const handle_reset = () => {
    set_value(
      column_param_definition.default_value
        ? dayjs(column_param_definition.default_value)
        : null
    )
    handle_change(undefined)
  }

  const handle_date_change = (new_value) => {
    set_value(new_value)
  }

  const is_changed =
    (value ? value.format('YYYY-MM-DD') : value) !== selected_param_values
  const is_default =
    (value ? value.format('YYYY-MM-DD') : value) ===
    column_param_definition.default_value

  const body = (
    <div className='column-param-date-filter'>
      <div className='column-param-filter-header'>
        <div>{label}</div>
        <div
          className='controls-button'
          onClick={() => set_trigger_close(!trigger_close)}>
          Close
        </div>
      </div>
      <div className='column-param-filter-body'>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={value}
            onChange={handle_date_change}
            format='YYYY-MM-DD'
            renderInput={(params) => <input {...params} />}
            {...datepicker_props}
            slotProps={datepicker_merged_slot_props}
          />
        </LocalizationProvider>
        {!is_default && (
          <div className='column-param-filter-buttons'>
            {is_changed && <Button onClick={handle_set}>Set</Button>}
            <Button onClick={handle_reset}>Reset</Button>
          </div>
        )}
      </div>
    </div>
  )

  const selected_label = mixed_state
    ? '-'
    : format_column_params({
        column_def: {
          column_params: { [column_param_name]: column_param_definition }
        },
        column_state_params: { [column_param_name]: selected_param_values },
        variant: 'short',
        default_label
      })

  return <FilterBase {...{ selected_label, body, label, trigger_close }} />
}

ColumnParamDateFilter.propTypes = {
  handle_change: PropTypes.func,
  column_param_name: PropTypes.string,
  column_param_definition: PropTypes.object,
  selected_param_values: PropTypes.string,
  mixed_state: PropTypes.bool
}
