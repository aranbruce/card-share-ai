"use client"

import { createContext, useContext } from "react"

/**
 * On-screen pixels per layout pixel of the card canvas. It is 1 for the flat card; when the
 * editor is drawn onto a page of the 3D card (in perspective) it is the page's on-screen scale,
 * so pointer movement can be converted back into canvas pixels.
 */
export const CardCanvasScaleContext = createContext(1)

export function useCardCanvasScale(): number {
  return useContext(CardCanvasScaleContext)
}

/**
 * Maps a screen point to layout pixels within `element` (a descendant of the editor) when the
 * editor is drawn in perspective, where no single scale is exact. Null for the flat card, or
 * when the point cannot be mapped; callers then fall back to `CardCanvasScaleContext`.
 */
export type CardCanvasPointMapper = (
  element: HTMLElement,
  clientX: number,
  clientY: number,
) => { x: number; y: number } | null

export const CardCanvasPointContext =
  createContext<CardCanvasPointMapper | null>(null)

export function useCardCanvasPoint(): CardCanvasPointMapper | null {
  return useContext(CardCanvasPointContext)
}
