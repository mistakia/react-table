import { useEffect, useState } from 'react'

export const WIDE_CONTROL_LAYOUT_MIN_WIDTH = 900

export default function use_wide_control_layout(is_active = true) {
  const [is_wide, set_is_wide] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.innerWidth >= WIDE_CONTROL_LAYOUT_MIN_WIDTH
  )

  useEffect(() => {
    if (!is_active) return undefined
    const handle_resize = () => {
      set_is_wide(window.innerWidth >= WIDE_CONTROL_LAYOUT_MIN_WIDTH)
    }
    handle_resize()
    window.addEventListener('resize', handle_resize)
    return () => window.removeEventListener('resize', handle_resize)
  }, [is_active])

  return is_wide
}
