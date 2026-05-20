"use client"

import { createContext, useContext, type PointerEvent } from "react"

export type MovePointerDownOptions = {
  /** Wait for movement past threshold before drag (text: tap still focuses). */
  deferUntilDrag?: boolean
}

export type DraggableNoteMoveContextValue = {
  onMovePointerDown: (e: PointerEvent, options?: MovePointerDownOptions) => void
  isMovingNote: boolean
  /**
   * After a completed note drag, the DOM may emit a ghost `click`. Call from the note surface
   * click handler; returns true when that click should be ignored (and the flag is cleared).
   */
  consumeSuppressNextClickAfterDrag: () => boolean
} | null

export const DraggableNoteMoveContext =
  createContext<DraggableNoteMoveContextValue>(null)

export function useDraggableNoteMove() {
  return useContext(DraggableNoteMoveContext)
}

export function noteMoveCursorClass(
  move: DraggableNoteMoveContextValue,
): string | undefined {
  if (!move) return undefined
  return move.isMovingNote ? "cursor-grabbing" : "cursor-grab"
}

/** Coarse pointers: touch-none on the note so vertical pans do not scroll the page before drag commits. */
export function noteMoveTouchClass(
  move: DraggableNoteMoveContextValue,
): string | undefined {
  if (!move) return undefined
  return "[@media(pointer:coarse)]:touch-none"
}
