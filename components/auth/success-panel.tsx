import type { ReactNode } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type AuthSuccessPanelProps = {
  title: string
  description: ReactNode
  /** Rendered below the description, e.g. a resend control. */
  children?: ReactNode
  footer?: ReactNode
  hint?: ReactNode
  action: { href: string; label: string }
}

export function AuthSuccessPanel({
  title,
  description,
  children,
  footer,
  hint,
  action,
}: AuthSuccessPanelProps) {
  return (
    <div className="text-center">
      <div className="mb-4 text-4xl" aria-hidden>
        ✓
      </div>
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-muted-foreground">{description}</p>
      {children}
      {footer ? (
        <p className="mb-8 text-sm text-muted-foreground">{footer}</p>
      ) : null}
      {hint ? (
        <Alert className="mb-6 text-left">
          <AlertDescription>
            {/* AlertDescription is a grid; wrap so inline links stay in the text flow */}
            <p>{hint}</p>
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        asChild
        variant="outline"
        size="lg"
        fullWidth
        className="border-border/50 hover:bg-secondary/50"
      >
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </div>
  )
}
