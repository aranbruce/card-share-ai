"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { buildLoginRedirectUrl } from "@/lib/safe-redirect-path"

type ConsentState =
  | { status: "loading" }
  | { status: "ready"; details: OAuthAuthorizationDetails }
  | { status: "redirecting" }
  | { status: "error"; message: string }

// The token it receives is a full session for this account, so say so plainly
const ACCESS_SUMMARY = [
  "Access your CardShare.ai account on your behalf",
  "Create, view and change your cards and the messages on them",
]

function OAuthConsentFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get("authorization_id")
  const [state, setState] = useState<ConsentState>(
    authorizationId
      ? { status: "loading" }
      : { status: "error", message: "This link is missing its request id." },
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authorizationId) return

    async function load(id: string) {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace(
          buildLoginRedirectUrl(
            `/oauth/consent?authorization_id=${encodeURIComponent(id)}`,
          ),
        )
        return
      }

      const { data, error } =
        await supabase.auth.oauth.getAuthorizationDetails(id)
      if (error || !data) {
        setState({
          status: "error",
          message:
            "This request has expired or is no longer valid. Go back to the app and try connecting again.",
        })
        return
      }
      if ("redirect_url" in data) {
        // Already approved before: hand straight back to the app
        setState({ status: "redirecting" })
        window.location.assign(data.redirect_url)
        return
      }
      setState({ status: "ready", details: data })
    }

    void load(authorizationId)
  }, [authorizationId, router])

  async function decide(approve: boolean) {
    if (!authorizationId) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
    if (error || !data) {
      setSubmitting(false)
      setState({
        status: "error",
        message: "Something went wrong. Go back to the app and try again.",
      })
      return
    }
    setState({ status: "redirecting" })
    window.location.assign(data.redirect_url)
  }

  if (state.status === "loading" || state.status === "redirecting") {
    return (
      <p className="text-center text-muted-foreground">
        {state.status === "loading" ? "Loading…" : "Returning to the app…"}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Couldn&apos;t connect
        </h1>
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { details } = state
  const clientName = details.client.name || "An app"
  let redirectHost = details.redirect_uri
  try {
    redirectHost = new URL(details.redirect_uri).host
  } catch {
    // show the raw value
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect {clientName} to CardShare.ai
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {details.user.email}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{clientName} will be able to:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {ACCESS_SUMMARY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          You&apos;ll be sent back to {redirectHost}. You can disconnect at any
          time from the app&apos;s connector settings.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={submitting}
          onClick={() => void decide(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => void decide(true)}
        >
          Allow
        </Button>
      </div>
    </div>
  )
}

export function OAuthConsentForm() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading…</p>}
    >
      <OAuthConsentFormInner />
    </Suspense>
  )
}
