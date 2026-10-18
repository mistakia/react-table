import { useEffect, useState } from 'react'

// The host's theme, `data-theme` on <html>, as React state. A component that
// paints colours it resolves at render (resolve-token-color.js) depends on it,
// so a theme change re-renders it instead of leaving it in the colours it was
// drawn in. A host that sets no theme reads as 'light'.

const read_theme = () =>
  typeof document === 'undefined'
    ? 'light'
    : document.documentElement.dataset.theme || 'light'

export const use_host_theme = () => {
  const [theme, set_theme] = useState(read_theme)
  useEffect(() => {
    const observer = new MutationObserver(() => set_theme(read_theme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    return () => observer.disconnect()
  }, [])
  return theme
}
