import { useCallback } from 'react'

export const use_count_children = () => {
  const count_children = useCallback((children) => {
    return children.reduce((acc, child) => {
      if (child.columns) {
        return acc + count_children(child.columns)
      } else {
        return acc + 1
      }
    }, 0)
  }, [])

  return count_children
}
