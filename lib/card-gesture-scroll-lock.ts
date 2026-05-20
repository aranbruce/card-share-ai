type SavedStyles = {
  overflow: string
  overscrollBehavior: string
  touchAction: string
}

type LockMode = "full" | "touchOnly"

/**
 * `overflow: hidden` on html/body breaks `position: sticky` (e.g. AppHeader). Document
 * roots only get touch/overscroll suppression; nested scrollers get full lock.
 */
function lockElement(el: HTMLElement, mode: LockMode) {
  const count = lockCounts.get(el) ?? 0
  if (count === 0) {
    savedStyles.set(el, {
      overflow: el.style.overflow,
      overscrollBehavior: el.style.overscrollBehavior,
      touchAction: el.style.touchAction,
    })
    if (mode === "full") {
      el.style.overflow = "hidden"
    }
    el.style.overscrollBehavior = "none"
    el.style.touchAction = "none"
  }
  lockCounts.set(el, count + 1)
}

const lockCounts = new Map<HTMLElement, number>()
const savedStyles = new Map<HTMLElement, SavedStyles>()

function isDocumentRoot(el: HTMLElement): boolean {
  return el === document.documentElement || el === document.body
}

function isScrollable(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  const overflowY = style.overflowY
  const overflowX = style.overflowX
  const canScrollY =
    (overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay") &&
    el.scrollHeight > el.clientHeight + 1
  const canScrollX =
    (overflowX === "auto" ||
      overflowX === "scroll" ||
      overflowX === "overlay") &&
    el.scrollWidth > el.clientWidth + 1
  return canScrollY || canScrollX
}

export type CardGestureScrollLockTargets = {
  full: HTMLElement[]
  touchOnly: HTMLElement[]
}

/** Scroll containers that can steal pan gestures while dragging notes on the card. */
export function collectCardGestureScrollLockTargets(
  anchor: HTMLElement,
): CardGestureScrollLockTargets {
  const targets = new Set<HTMLElement>()
  const canvas = anchor.closest("[data-card-canvas]") as HTMLElement | null
  if (canvas && !isDocumentRoot(canvas)) targets.add(canvas)

  let parent: HTMLElement | null = anchor.parentElement
  while (parent) {
    if (!isDocumentRoot(parent) && isScrollable(parent)) targets.add(parent)
    parent = parent.parentElement
  }

  return {
    full: [...targets],
    touchOnly: [document.documentElement, document.body],
  }
}

function unlockElement(el: HTMLElement) {
  const count = lockCounts.get(el) ?? 0
  if (count <= 1) {
    lockCounts.delete(el)
    const prev = savedStyles.get(el)
    if (prev) {
      el.style.overflow = prev.overflow
      el.style.overscrollBehavior = prev.overscrollBehavior
      el.style.touchAction = prev.touchAction
      savedStyles.delete(el)
    }
  } else {
    lockCounts.set(el, count - 1)
  }
}

export type CardGestureScrollLockRelease = () => void

/** Lock page + nested scrollers while a note drag/resize is active. */
export function acquireCardGestureScrollLock(
  anchor: HTMLElement,
): CardGestureScrollLockRelease {
  const { full, touchOnly } = collectCardGestureScrollLockTargets(anchor)
  const lockedElements: HTMLElement[] = []

  for (const el of full) {
    lockElement(el, "full")
    lockedElements.push(el)
  }
  for (const el of touchOnly) {
    lockElement(el, "touchOnly")
    lockedElements.push(el)
  }

  let released = false
  return () => {
    if (released) return
    released = true
    for (const el of lockedElements) {
      unlockElement(el)
    }
  }
}
