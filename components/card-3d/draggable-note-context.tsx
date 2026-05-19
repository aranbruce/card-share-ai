"use client"

import { createContext, useContext, type PointerEvent } from "react"

export type MovePointerDownOptions = {
  /** Wait for movement past threshold before drag (text: tap still focuses). */
  deferUntilDrag?: boolean
}

export type DraggableNoteMoveContextValue = {
  onMovePointerDown: (e: PointerEvent, options?: MovePointerDownOptions) => void
  isMovingNote: boolean
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
