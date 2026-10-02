import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex field-sizing-content w-full border bg-transparent text-base shadow-xs transition-[color,border-color,box-shadow] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-[3px] aria-invalid:focus-visible:ring-destructive/15 md:text-sm dark:bg-input/30",
  {
    variants: {
      variant: {
        default:
          "min-h-16 rounded-md border-input px-3 py-2 focus-visible:border-ring dark:bg-input/30",
        /** Card details / long-form on tinted panels */
        card: "min-h-30 resize-y rounded-2xl border border-border/50 bg-background/50 px-4 py-3 focus-visible:border-ring focus-visible:ring-1 dark:bg-background/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
