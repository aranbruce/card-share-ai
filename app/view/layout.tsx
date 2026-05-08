import { Logo } from "@/components/logo"

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
      <header className="flex h-16 shrink-0 items-center justify-center">
        <Logo />
      </header>
      {children}
    </div>
  )
}
