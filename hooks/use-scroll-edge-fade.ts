"use client"

import {
  type CSSProperties,
  type DependencyList,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

/**
 * Tracks whether a horizontal scroller has more content either side, and builds a mask
 * that fades an edge only while there's more to scroll that way.
 */
export function useScrollEdgeFade<T extends HTMLElement>(
  fadeWidth: string,
  deps: DependencyList = [],
) {
  const ref = useRef<T>(null)
  const [canScroll, setCanScroll] = useState({ back: false, forward: false })

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const back = el.scrollLeft > 1
    const forward = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setCanScroll((prev) =>
      prev.back === back && prev.forward === forward ? prev : { back, forward },
    )
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    onScroll()
    const observer = new ResizeObserver(onScroll)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScroll, ...deps])

  const edge = (more: boolean) => (more ? "transparent" : "black")
  const mask = `linear-gradient(to right, ${edge(canScroll.back)}, black ${fadeWidth}, black calc(100% - ${fadeWidth}), ${edge(canScroll.forward)})`
  const maskStyle: CSSProperties = { maskImage: mask, WebkitMaskImage: mask }

  return { ref, onScroll, canScroll, maskStyle }
}
