"use client"

import { Box, Pencil, RectangleVertical } from "lucide-react"

export type CardViewMode = "3d" | "flat"

/** Pill switch between the Three.js card and the flat (editable) card. */
export function CardViewToggle({
  value,
  onChange,
  mode = "view",
  className,
}: {
  value: CardViewMode
  onChange: (mode: CardViewMode) => void
  /** "edit" labels the DOM card as the editor; "view" calls it the flat card. */
  mode?: "edit" | "view"
  className?: string
}) {
  const FlatIcon = mode === "edit" ? Pencil : RectangleVertical
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
                <FlatIcon aria-hidden />
                {mode === "edit" ? "Edit" : "Flat"}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
