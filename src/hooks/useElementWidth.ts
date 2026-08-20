import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Measures an element's content width and keeps it in sync via ResizeObserver.
 * Lets SVG charts render at the true available width instead of a fixed viewBox,
 * so they stay crisp and correctly proportioned at any breakpoint.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
