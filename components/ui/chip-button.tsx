import * as React from "react"
import { cn } from "@/lib/utils"

function ChipButton({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="chip-button"
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { ChipButton }
