import { useState, useEffect, useRef, useCallback } from 'react'

// An expanding control (column / filter) opens to a viewport-sized panel —
// 60vw wide, up to 80vh tall, centered horizontally on the WINDOW. Positioned
// `absolute` inside the toolbar, that only survives while every ancestor
// between the panel and the viewport has visible overflow, which is true for a
// full-page table container and false for anything else. league's selected
// player drawer renders the same table inside a scrolling tab panel, and the
// panel was clipped to that panel's box on both axes — the column and filter
// managers opened as a sliver with their own scrollbars.
//
// So the panel is `fixed` while open: fixed boxes are not clipped by an
// ancestor's overflow, so the control works in any consumer container. The
// caveat is the standard one — an ancestor carrying `transform`, `filter`,
// `contain` or `will-change` becomes the containing block and the escape
// stops working. MUI's Drawer clears its slide transform once the sheet has
// settled, which is why the drawer case holds.
//
// `left` stays at the closed slot and the centering is carried by
// `translateX`, exactly as before, so the open animation is unchanged: only
// transform, width and max-height move, and each is transitioned.

const VIEWPORT_MARGIN = 8

// Below this, opening downward from the anchor is not worth doing and the
// panel is bottom-aligned to the viewport instead.
const MIN_DOWNWARD_HEIGHT = 240

const get_viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight
})

export default function use_expanding_control_anchor({
  is_open,
  is_closing,
  open_width
}) {
  const container_ref = useRef(null)
  // The closed slot's viewport position, captured once per open. Re-measuring
  // while open would read the element at its own fixed offset and compound it.
  const anchor_ref = useRef(null)
  const [anchor_style, set_anchor_style] = useState(null)

  const compute = useCallback(() => {
    const anchor = anchor_ref.current
    if (!anchor) return

    const base_style = {
      position: 'fixed',
      left: `${Math.round(anchor.left)}px`,
      top: `${Math.round(anchor.top)}px`
    }

    // Collapsing: hold the fixed frame but return to the slot, so the panel
    // animates back onto its own button instead of snapping there once the
    // close finishes and the element goes back to `absolute`.
    if (!is_open) {
      set_anchor_style({ ...base_style, transform: 'translateX(0px)' })
      return
    }

    const viewport = get_viewport()

    const target_left = Math.max(
      VIEWPORT_MARGIN,
      (viewport.width - open_width) / 2
    )

    const desired_height = Math.min(
      0.8 * viewport.height,
      viewport.height - 2 * VIEWPORT_MARGIN
    )
    const space_below = viewport.height - anchor.top - VIEWPORT_MARGIN

    let top = anchor.top
    let max_height = Math.min(desired_height, space_below)

    if (max_height < Math.min(desired_height, MIN_DOWNWARD_HEIGHT)) {
      max_height = desired_height
      top = Math.max(
        VIEWPORT_MARGIN,
        viewport.height - VIEWPORT_MARGIN - max_height
      )
    }

    set_anchor_style({
      ...base_style,
      top: `${Math.round(top)}px`,
      maxHeight: `${Math.round(max_height)}px`,
      transform: `translateX(${Math.round(target_left - anchor.left)}px)`
    })
  }, [is_open, open_width])

  useEffect(() => {
    if (!is_open && !is_closing) {
      anchor_ref.current = null
      set_anchor_style(null)
      return
    }

    if (!anchor_ref.current) {
      if (!container_ref.current) return
      const rect = container_ref.current.getBoundingClientRect()
      anchor_ref.current = { left: rect.left, top: rect.top }
    }

    compute()

    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [is_open, is_closing, compute])

  return { container_ref, anchor_style }
}
