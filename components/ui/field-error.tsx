import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The message under an invalid field. Point the field's `aria-describedby` at its `id`
 * and set `aria-invalid` on the field so it turns red. Renders nothing without a message.
 */
function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      data-slot="field-error"
      className={cn(
        "mt-1.5 text-[13px] leading-[1.4] text-destructive-text",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export { FieldError }
