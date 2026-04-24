import { AppHeader } from "@/components/app-header"
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button"
import type { ReactNode } from "react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader right={<DashboardSignOutButton />} />
      {children}
    </div>
  )
}
