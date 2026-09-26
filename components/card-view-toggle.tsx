"use client"

export type CardViewMode = "3d" | "flat"

/** Pill switch between the Three.js card and the flat (editable) card. */
export function CardViewToggle({
  value,
  onChange,
  flatLabel = "Flat",
  className,
}: {
  value: CardViewMode
  onChange: (mode: CardViewMode) => void
  /** Label for the DOM card; editing surfaces call it "Edit". */
  flatLabel?: string
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
            className={`rounded-full px-3 py-1 transition-colors ${
              value === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "3d" ? "3D" : flatLabel}
          </button>
        ))}
      </div>
    </div>
  )
}
