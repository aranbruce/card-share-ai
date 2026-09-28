/**
 * Size of the 3D card's frame. Shared with the loading placeholder (which must not pull in
 * `three`) so the page does not shift when the card arrives.
 */
export function cardBookFrameClass(
  coverOnly: boolean,
  editable: boolean,
): string {
  if (coverOnly) return "aspect-4/5"
  return editable
    ? "aspect-4/5 sm:aspect-auto sm:h-[560px]"
    : "aspect-4/5 sm:aspect-4/3"
}
