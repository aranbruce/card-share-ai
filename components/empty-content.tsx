import { FileX2, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type EmptyContentProps = {
  description: string
  actions: ReactNode
  title?: string
  icon?: LucideIcon
}

export function EmptyContent({
  description,
  actions,
  title = "Card not found",
  icon: Icon = FileX2,
}: EmptyContentProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {actions}
    </div>
  )
}
