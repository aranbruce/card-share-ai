import * as React from "react"
import { cn } from "@/lib/utils"

function ChipButton({
  active,
  size = "default",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean
  size?: "default" | "sm"
}) {
  return (
    <button
      type="button"
      data-slot="chip-button"
      className={cn(
        "flex cursor-pointer flex-nowrap items-center rounded-full border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm"
          ? "gap-1 px-2.5 py-1 text-xs [&_svg]:size-3"
          : "gap-1.5 px-3 py-1.5 text-sm",
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
