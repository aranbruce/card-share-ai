import { cn } from "@/lib/utils"

/** "Step 1 of 2" with a bar per step, filled up to the current one. */
export function CreateStepIndicator({
  step,
  total,
  className,
}: {
  step: number
  total: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-[3px] w-5 rounded-full",
              i < step ? "bg-foreground" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        Step {step} of {total}
      </span>
    </div>
  )
}
