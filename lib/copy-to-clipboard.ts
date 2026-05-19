/**
 * Copy text to the system clipboard.
 * Tries synchronous execCommand first (mobile Safari / HTTP), then Clipboard API.
 */

export type CopySyncOptions = {
  /** Element that was clicked — restores scroll and receives focus after copy. */
  scrollAnchor?: HTMLElement | null
  /** Hidden field scope inside a modal (iOS focus trap). */
  copyContainer?: HTMLElement | null
  /** Last-resort visible URL field inside a modal. */
  input?: HTMLInputElement | HTMLTextAreaElement | null
}

type ScrollSnapshot = {
  windowX: number
  windowY: number
  elements: Array<{ element: HTMLElement; top: number; left: number }>
}

function captureScrollSnapshot(anchor: HTMLElement | null): ScrollSnapshot {
  const elements: ScrollSnapshot["elements"] = []
  let el: HTMLElement | null = anchor

  while (el) {
    elements.push({
      element: el,
      top: el.scrollTop,
      left: el.scrollLeft,
    })
    el = el.parentElement
  }

  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    elements,
  }
}

function restoreScrollSnapshot(snapshot: ScrollSnapshot): void {
  for (const { element, top, left } of snapshot.elements) {
    element.scrollTop = top
    element.scrollLeft = left
  }
  window.scrollTo(snapshot.windowX, snapshot.windowY)
}

function restoreScrollAfterCopy(snapshot: ScrollSnapshot): void {
  restoreScrollSnapshot(snapshot)
  requestAnimationFrame(() => {
    restoreScrollSnapshot(snapshot)
  })
}

function createHiddenCopyInput(): HTMLInputElement {
  const el = document.createElement("input")
  el.type = "text"
  el.readOnly = true
  el.setAttribute("readonly", "true")
  el.setAttribute("aria-hidden", "true")
  el.setAttribute("tabindex", "-1")
  el.setAttribute("inputmode", "none")
  el.setAttribute("autocomplete", "off")
  el.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:1px",
    "height:1px",
    "padding:0",
    "border:none",
    "outline:none",
    "box-shadow:none",
    "background:transparent",
    "opacity:0",
    "pointer-events:none",
    "font-size:16px",
  ].join(";")
  return el
}

let sharedBodyCopyField: HTMLInputElement | null = null
const containerCopyFields = new WeakMap<HTMLElement, HTMLInputElement>()

function getCopyField(parent?: HTMLElement | null): HTMLInputElement {
  if (parent) {
    let field = containerCopyFields.get(parent)
    if (!field?.isConnected) {
      field = createHiddenCopyInput()
      parent.appendChild(field)
      containerCopyFields.set(parent, field)
    }
    return field
  }

  if (sharedBodyCopyField?.isConnected) {
    return sharedBodyCopyField
  }

  sharedBodyCopyField = createHiddenCopyInput()
  document.body.appendChild(sharedBodyCopyField)
  return sharedBodyCopyField
}

function releaseFocusAfterCopy(
  copyField: HTMLElement,
  returnFocusTo?: HTMLElement | null,
): void {
  copyField.blur()
  window.getSelection()?.removeAllRanges()
  if (returnFocusTo?.isConnected) {
    returnFocusTo.focus({ preventScroll: true })
  }
}

function copyWithExecCommand(
  text: string,
  options?: { scrollAnchor?: HTMLElement | null; parent?: HTMLElement | null },
): void {
  const scrollSnapshot = captureScrollSnapshot(options?.scrollAnchor ?? null)
  const el = getCopyField(options?.parent)
  el.value = text

  let ok = false
  try {
    el.focus({ preventScroll: true })
    el.select()
    el.setSelectionRange(0, text.length)
    ok = document.execCommand("copy")
  } finally {
    el.value = ""
    releaseFocusAfterCopy(el, options?.scrollAnchor)
    restoreScrollAfterCopy(scrollSnapshot)
  }

  if (!ok) {
    throw new Error("Copy command was rejected")
  }
}

/**
 * Copy by selecting a visible input (last resort inside modals on iOS).
 */
export function tryCopyFromInputElement(
  el: HTMLInputElement | HTMLTextAreaElement,
  returnFocusTo?: HTMLElement | null,
): boolean {
  if (typeof document === "undefined") return false

  const value = el.value
  if (!value) return false

  const scrollSnapshot = captureScrollSnapshot(returnFocusTo ?? el)
  const wasReadOnly = el.readOnly

  if (wasReadOnly) {
    el.readOnly = false
  }

  let ok = false
  try {
    el.focus({ preventScroll: true })
    el.select()
    try {
      el.setSelectionRange(0, value.length)
    } catch {
      // Some input types do not support setSelectionRange.
    }
    ok = document.execCommand("copy")
  } catch {
    ok = false
  } finally {
    if (wasReadOnly) {
      el.readOnly = true
    }
    releaseFocusAfterCopy(el, returnFocusTo)
    restoreScrollAfterCopy(scrollSnapshot)
  }

  return ok
}

/**
 * Sync copy — call from a click/tap handler with no `await` before this.
 * Returns false when the Clipboard API should be tried next.
 */
export function tryCopyTextToClipboardSync(
  text: string,
  options?: CopySyncOptions,
): boolean {
  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available")
  }

  const returnFocus = options?.scrollAnchor

  if (options?.copyContainer) {
    try {
      copyWithExecCommand(text, {
        scrollAnchor: returnFocus,
        parent: options.copyContainer,
      })
      return true
    } catch {
      // Fall through.
    }
  }

  try {
    copyWithExecCommand(text, { scrollAnchor: returnFocus })
    return true
  } catch {
    // Fall through.
  }

  if (options?.input) {
    return tryCopyFromInputElement(options.input, returnFocus)
  }

  return false
}

/** Clipboard API fallback (HTTPS / secure contexts). */
export function copyTextWithClipboardApi(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error("Clipboard API is not available"))
  }
  return navigator.clipboard.writeText(text)
}
