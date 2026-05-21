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
})

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-dancing-script",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-playfair",
})

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-lora",
})

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-message-pacifico",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-message-merriweather",
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
