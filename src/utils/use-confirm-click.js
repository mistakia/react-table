import { useState, useCallback, useEffect, useRef } from 'react'

const CONFIRM_TIMEOUT_MS = 6000

export const use_confirm_click = ({ on_confirm } = {}) => {
  const [is_confirming, set_is_confirming] = useState(false)
  const is_confirming_ref = useRef(false)
  const timer_ref = useRef(null)
  const on_confirm_ref = useRef(on_confirm)

  on_confirm_ref.current = on_confirm

  useEffect(() => {
    return () => {
      if (timer_ref.current) clearTimeout(timer_ref.current)
    }
  }, [])

  const set_confirming = useCallback((next) => {
    is_confirming_ref.current = next
    set_is_confirming(next)
  }, [])

  const reset = useCallback(() => {
    if (timer_ref.current) clearTimeout(timer_ref.current)
    set_confirming(false)
  }, [set_confirming])

  const handle_click = useCallback(() => {
    if (is_confirming_ref.current) {
      if (timer_ref.current) clearTimeout(timer_ref.current)
      set_confirming(false)
      if (on_confirm_ref.current) on_confirm_ref.current()
      return
    }
    timer_ref.current = setTimeout(() => set_confirming(false), CONFIRM_TIMEOUT_MS)
    set_confirming(true)
  }, [set_confirming])

  return { is_confirming, handle_click, reset }
}

export default use_confirm_click
