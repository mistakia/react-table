import { useEffect, useState } from 'react'

import { get_scroll_parent } from './get-scroll-parent'

// Visible width of the box the table scrolls inside. Sticky offsets resolve
// against this box, so it -- not the table's own fit-content width -- is what
// decides how much pinning a viewport can afford. Returns 0 until measured;
// callers should read 0 as "unknown" rather than "no room".
export default function use_scroll_parent_width(container_ref) {
  const [width, set_width] = useState(0)

  useEffect(() => {
    const node = container_ref.current
    if (!node) return undefined

    const scroll_parent = get_scroll_parent(node)
    // A body scroll parent has no meaningful clientWidth for this purpose --
    // the viewport is the documentElement.
    const measured_node =
      scroll_parent === document.body ? document.documentElement : scroll_parent
    const measure = () => set_width(measured_node.clientWidth)

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(measured_node)
    return () => observer.disconnect()
  }, [container_ref])

  return width
}
