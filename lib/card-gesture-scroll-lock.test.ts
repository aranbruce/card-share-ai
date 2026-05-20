/** @vitest-environment happy-dom */

import { describe, expect, it, beforeEach } from "vitest"
import {
  acquireCardGestureScrollLock,
  collectCardGestureScrollLockTargets,
} from "./card-gesture-scroll-lock"

describe("card-gesture-scroll-lock", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    document.body.style.overflow = ""
    document.body.style.touchAction = ""
    document.body.style.overscrollBehavior = ""
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
    expect(full).not.toContain(document.documentElement)
  })

  it("keeps scrollable body in touchOnly even when it would match isScrollable", () => {
    const note = document.createElement("div")
    document.body.style.overflowY = "auto"
    document.body.appendChild(note)

    Object.defineProperty(document.body, "scrollHeight", {
      value: 500,
      configurable: true,
    })
    Object.defineProperty(document.body, "clientHeight", {
      value: 100,
      configurable: true,
    })

    const { full, touchOnly } = collectCardGestureScrollLockTargets(note)
    expect(full).not.toContain(document.body)
    expect(touchOnly).toContain(document.body)
  })

  it("does not set overflow hidden on body (preserves sticky headers)", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)
    const prevOverflow = document.body.style.overflow

    const release = acquireCardGestureScrollLock(anchor)
    expect(document.body.style.overflow).toBe(prevOverflow)
    expect(document.body.style.touchAction).toBe("none")

    release()
    expect(document.body.style.touchAction).toBe("")
  })

  it("ref-counts overlapping targets across concurrent acquires", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)

    const releaseA = acquireCardGestureScrollLock(anchor)
    expect(document.body.style.touchAction).toBe("none")
    const releaseB = acquireCardGestureScrollLock(anchor)
    expect(document.body.style.touchAction).toBe("none")

    releaseA()
    expect(document.body.style.touchAction).toBe("none")

    releaseB()
    expect(document.body.style.touchAction).toBe("")
  })

  it("release handle is idempotent", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)

    const release = acquireCardGestureScrollLock(anchor)
    release()
    release()
    expect(document.body.style.touchAction).toBe("")
  })
})
