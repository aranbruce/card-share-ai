"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Cycles through `count` steps every `stepMs` while `target` is on screen, unless the
 * visitor prefers reduced motion (then it stays on the first step and only changes when a
 * step is picked). `run` changes on every (re)start, so a progress bar can restart with it.
 */
export function useAutoStep(count: number, stepMs: number) {
  const target = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(0)
  const [visible, setVisible] = useState(false)
  const [autoplay, setAutoplay] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const update = () => setAutoplay(motion.matches)
    update()
    motion.addEventListener("change", update)
    return () => motion.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const el = target.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const playing = autoplay && visible
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      setStep((s) => (s + 1) % count)
      setRun((r) => r + 1)
    }, stepMs)
    return () => clearTimeout(timer)
  }, [playing, run, count, stepMs])

  const select = (i: number) => {
    setStep(i)
    setRun((r) => r + 1)
  }

  return { target, step, run, playing, autoplay, select }
}
