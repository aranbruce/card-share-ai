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
        // Full page load, not router.push: the client router can reuse a response
        // for "/" fetched while signed in, which the proxy redirected to /dashboard.
        window.location.assign("/")
      }}
    >
      Sign out
    </Button>
  )
}
