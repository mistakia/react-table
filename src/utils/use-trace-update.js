import { useRef, useEffect } from 'react'

export default function use_trace_update(component_name, props) {
  const prev = useRef(props)
  useEffect(() => {
    const changed_props = Object.entries(props).reduce((ps, [k, v]) => {
      if (prev.current[k] !== v) {
        ps[k] = [prev.current[k], v]
      }
      return ps
    }, {})
    if (Object.keys(changed_props).length > 0) {
      console.log(`${component_name} - Changed props:`, changed_props)
    }
    prev.current = props
  })
}
