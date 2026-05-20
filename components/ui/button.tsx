import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border bg-card shadow-xs hover:bg-secondary hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1 px-3 has-[>svg]:px-2.5 rounded-md",
        default: "h-9 px-4 gap-1.5 py-2 has-[>svg]:px-3 rounded-lg",
        lg: "h-10 gap-1 px-6 has-[>svg]:px-4 rounded-xl",
        xl: "h-12 gap-1.5 px-8 text-base shadow-sm has-[>svg]:px-6 rounded-xl",
        icon: "size-9 rounded-xl",
        "icon-sm": "size-8 rounded-xl",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "default",
    },
  },
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
      /** Fill parent width (e.g. stacked actions in modals and narrow forms). */
      fullWidth?: boolean
    }
>(function Button(
  { className, variant, size, fullWidth, asChild = false, ...props },
  ref,
) {
  const classes = cn(
    buttonVariants({ variant, size }),
    fullWidth && "w-full",
    className,
  )

  if (asChild) {
    return (
      <Slot
        ref={ref as React.Ref<HTMLElement>}
        data-slot="button"
        className={classes}
        {...props}
      />
    )
  }

  return (
    <button ref={ref} data-slot="button" className={classes} {...props} />
  )
})

Button.displayName = "Button"

export { Button, buttonVariants }
