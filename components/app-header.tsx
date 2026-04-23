import { Logo } from "@/components/logo"
import type { ReactNode } from "react"

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between px-6">
        <Logo />
        {right ?? <div />}
      </div>
    </header>
  )
}
