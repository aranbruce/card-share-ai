// Client boundary: imported only from client pages (contribute, dashboard, view).
"use client"

import type { ReactNode } from "react"
import {
  Caveat,
  Dancing_Script,
  Lora,
  Merriweather,
  Pacifico,
  Playfair_Display,
} from "next/font/google"

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-caveat",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-dancing-script",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-playfair",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-lora",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-message-pacifico",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-merriweather",
  // Card surfaces load these on demand (see card-book-3d); preloading them on every
  // page competed with the page font and delayed it, shifting the layout when it swapped.
  preload: false,
})

const MESSAGE_FONT_VARIABLE_CLASSES = [
  caveat.variable,
  dancingScript.variable,
  playfair.variable,
  lora.variable,
  pacifico.variable,
  merriweather.variable,
].join(" ")

/** Loads CSS variables for curated message fonts on card surfaces. */
export function MessageFontVariables({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`${MESSAGE_FONT_VARIABLE_CLASSES}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  )
}
