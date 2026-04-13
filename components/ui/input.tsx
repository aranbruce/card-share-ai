import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const inputVariants = cva(
  'h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
  {
    variants: {
      variant: {
        default:
          'border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30',
        /** Auth / marketing forms: taller field, soft secondary fill, lighter focus ring */
        auth: 'mt-1 h-12 border-border/50 bg-secondary/20 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-secondary/20',
        /** Card builder and similar: tall field on subtle background */
        soft: 'h-12 border-border/50 bg-background/50 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-background/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Input({
  className,
  type,
  variant,
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
