import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import ClickAwayListener from '@mui/material/ClickAwayListener'

import { get_string_from_object } from '#src/utils'
import { get_search_adapter } from '#src/search/registry.js'

import './table-search-input.styl'

const DEBOUNCE_MS = 500

const TableSearchInput = ({
  view_search_config,
  table_state,
  current_rows,
  on_table_state_change,
  on_client_filter_change,
  on_highlights_change
}) => {
  const adapter_type = view_search_config?.type
  const adapter = useMemo(
    () => get_search_adapter(adapter_type),
    [adapter_type]
  )

  const validation_error = useMemo(() => {
    if (!adapter) return null
    return adapter.validate(view_search_config)
  }, [adapter, view_search_config])

  const initial_query =
    (table_state && typeof table_state.q === 'string' && table_state.q) || ''
  const [text_value, set_text_value] = useState(initial_query)
  const [is_open, set_is_open] = useState(Boolean(initial_query))
  const input_ref = useRef(null)
  const timer_ref = useRef(null)
  const abort_ref = useRef(null)
  const last_query_ref = useRef(initial_query)
  // Live refs for values consumed by the debounced run_adapter timer. The
  // setTimeout callback must read the most recent table_state / current_rows
  // at fire time (not the values captured when the keystroke was processed),
  // otherwise concurrent state changes during the 500 ms window are silently
  // overwritten when apply_result spreads a stale base into on_table_state_change.
  const table_state_ref = useRef(table_state)
  const current_rows_ref = useRef(current_rows)
  const callbacks_ref = useRef({
    on_table_state_change,
    on_client_filter_change,
    on_highlights_change
  })

  useEffect(() => {
    table_state_ref.current = table_state
  }, [table_state])
  useEffect(() => {
    current_rows_ref.current = current_rows
  }, [current_rows])
  useEffect(() => {
    callbacks_ref.current = {
      on_table_state_change,
      on_client_filter_change,
      on_highlights_change
    }
  }, [on_table_state_change, on_client_filter_change, on_highlights_change])

  useEffect(() => {
    if (!adapter) return
    const next = table_state?.q || ''
    if (next !== last_query_ref.current) {
      last_query_ref.current = next
      set_text_value(next)
    }
  }, [adapter, table_state?.q])

  const apply_result = useCallback((result) => {
    if (!result) return
    const cbs = callbacks_ref.current
    if (result.state_patch) {
      cbs.on_table_state_change({
        ...table_state_ref.current,
        ...result.state_patch
      })
    }
    if (Object.prototype.hasOwnProperty.call(result, 'client_filter')) {
      if (typeof cbs.on_client_filter_change === 'function') {
        cbs.on_client_filter_change(result.client_filter || null)
      }
    }
    if (Object.prototype.hasOwnProperty.call(result, 'highlights')) {
      if (typeof cbs.on_highlights_change === 'function') {
        cbs.on_highlights_change(result.highlights || {})
      }
    }
  }, [])

  const run_adapter = useCallback(
    async (query) => {
      if (!adapter || validation_error) return
      if (abort_ref.current) abort_ref.current.abort()
      const controller = new AbortController()
      abort_ref.current = controller
      try {
        const result = await adapter.run({
          query,
          table_state: table_state_ref.current,
          current_rows: current_rows_ref.current,
          view_search_config,
          signal: controller.signal
        })
        if (controller.signal.aborted) return
        last_query_ref.current = query
        apply_result(result)
      } catch (err) {
        if (controller.signal.aborted) return
        // Adapter errors should not surface as render-time exceptions; log and
        // leave state untouched so the user can retry.
        console.error('search adapter run failed', err)
      }
    },
    [adapter, validation_error, view_search_config, apply_result]
  )

  const handle_change = (event) => {
    const value = event.target.value
    set_text_value(value)
    if (timer_ref.current) clearTimeout(timer_ref.current)
    timer_ref.current = setTimeout(() => {
      run_adapter(value)
    }, DEBOUNCE_MS)
  }

  const handle_clear = useCallback(() => {
    set_text_value('')
    if (timer_ref.current) clearTimeout(timer_ref.current)
    run_adapter('')
  }, [run_adapter])

  useEffect(
    () => () => {
      if (timer_ref.current) clearTimeout(timer_ref.current)
      if (abort_ref.current) abort_ref.current.abort()
    },
    []
  )

  const handle_icon_click = () => {
    set_is_open(true)
    if (input_ref.current) input_ref.current.focus()
  }

  const handle_key_down = (event) => {
    if (event.key === 'Escape') {
      set_is_open(false)
      if (input_ref.current) input_ref.current.blur()
    }
  }

  const disabled = Boolean(!adapter || validation_error)
  if (disabled && !adapter && view_search_config) {
    console.warn(
      `TableSearchInput: unknown adapter id "${view_search_config.type}"`
    )
  }

  return (
    <ClickAwayListener onClickAway={() => set_is_open(false)}>
      <div
        className={get_string_from_object({
          'table-search': true,
          '-open': is_open || Boolean(text_value),
          '-disabled': disabled
        })}
        title={validation_error || undefined}>
        <div className='table-search-icon'>
          <SearchIcon onClick={handle_icon_click} />
        </div>
        <input
          ref={input_ref}
          className='table-search-input'
          type='text'
          placeholder='Search'
          value={text_value}
          onChange={handle_change}
          onKeyDown={handle_key_down}
          disabled={disabled}
        />
        {text_value && (
          <div className='table-search-clear' onClick={handle_clear}>
            <ClearIcon />
          </div>
        )}
      </div>
    </ClickAwayListener>
  )
}

TableSearchInput.propTypes = {
  view_search_config: PropTypes.object.isRequired,
  table_state: PropTypes.object.isRequired,
  current_rows: PropTypes.array,
  on_table_state_change: PropTypes.func.isRequired,
  on_client_filter_change: PropTypes.func,
  on_highlights_change: PropTypes.func
}

export default React.memo(TableSearchInput)
