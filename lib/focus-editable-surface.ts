/** Focus a contentEditable surface and optionally select all contents. */
export function focusEditableSurface(
  el: HTMLElement,
  options?: { selectAll?: boolean; preventScroll?: boolean },
): void {
  try {
    el.focus({ preventScroll: options?.preventScroll ?? false })
  } catch {
    el.focus()
  }
  if (options?.selectAll === false) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

export function isEditableSurfaceFocused(el: HTMLElement): boolean {
  return (
    document.activeElement === el ||
    (document.activeElement != null && el.contains(document.activeElement))
  )
}
