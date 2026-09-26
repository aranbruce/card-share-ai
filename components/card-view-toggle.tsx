"use client"

import { Box, RectangleVertical } from "lucide-react"

export type CardViewMode = "3d" | "flat"

/** Pill switch between the Three.js card and the flat card for recipients. */
export function CardViewToggle({
  value,
  onChange,
  className,
}: {
  value: CardViewMode
  onChange: (mode: CardViewMode) => void
  className?: string
}) {
  return (
    <div className={`flex justify-center${className ? ` ${className}` : ""}`}>
      <div
        role="group"
        aria-label="Card view"
        className="inline-flex rounded-full border border-border p-0.5 text-xs"
      >
        {(["3d", "flat"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors [&_svg]:size-3.5 ${
              value === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "3d" ? (
              <>
                <Box aria-hidden />
                3D
              </>
            ) : (
              <>
                <RectangleVertical aria-hidden />
                Flat
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
