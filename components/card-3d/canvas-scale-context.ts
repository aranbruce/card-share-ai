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
