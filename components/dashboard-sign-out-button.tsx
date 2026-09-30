"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DashboardSignOutButton() {
  const supabase = createClient()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={async () => {
        await supabase.auth.signOut()
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load: client router can reuse a "/" response fetched while signed in (proxy redirected to /dashboard)
        window.location.assign("/")
      }}
    >
      Sign out
    </Button>
  )
}
