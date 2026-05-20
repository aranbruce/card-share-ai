/** @vitest-environment happy-dom */

import { describe, expect, it, beforeEach, afterEach } from "vitest"
import {
  acquireCardGestureScrollLock,
  collectCardGestureScrollLockTargets,
  releaseCardGestureScrollLock,
} from "./card-gesture-scroll-lock"

describe("card-gesture-scroll-lock", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    releaseCardGestureScrollLock()
    releaseCardGestureScrollLock()
  })

  afterEach(() => {
    releaseCardGestureScrollLock()
    releaseCardGestureScrollLock()
  })

  it("collects canvas and scrollable ancestors for full lock; document roots for touch only", () => {
    const main = document.createElement("main")
    main.style.overflowY = "auto"
    main.style.height = "100px"
    const canvas = document.createElement("div")
    canvas.setAttribute("data-card-canvas", "")
    const note = document.createElement("div")
    canvas.appendChild(note)
    main.appendChild(canvas)
    document.body.appendChild(main)

    Object.defineProperty(main, "scrollHeight", {
      value: 500,
      configurable: true,
    })
    Object.defineProperty(main, "clientHeight", {
      value: 100,
      configurable: true,
    })

    const { full, touchOnly } = collectCardGestureScrollLockTargets(note)
    expect(full).toContain(canvas)
    expect(full).toContain(main)
    expect(touchOnly).toContain(document.body)
    expect(touchOnly).toContain(document.documentElement)
    expect(full).not.toContain(document.body)
  })

  it("does not set overflow hidden on body (preserves sticky headers)", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)
    const prevOverflow = document.body.style.overflow

    acquireCardGestureScrollLock(anchor)
    expect(document.body.style.overflow).toBe(prevOverflow)
    expect(document.body.style.touchAction).toBe("none")

    releaseCardGestureScrollLock()
    expect(document.body.style.touchAction).toBe("")
  })

  it("ref-counts nested acquire/release", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)

    acquireCardGestureScrollLock(anchor)
    expect(document.body.style.touchAction).toBe("none")
    acquireCardGestureScrollLock(anchor)
    expect(document.body.style.touchAction).toBe("none")

    releaseCardGestureScrollLock()
    expect(document.body.style.touchAction).toBe("none")

    releaseCardGestureScrollLock()
    expect(document.body.style.touchAction).toBe("")
  })
})
