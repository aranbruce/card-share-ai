import { getBot } from "@/lib/bot"
import { after } from "next/server"
import type { NextRequest } from "next/server"

export const maxDuration = 60

// Store the initialization promise so we can await it before the first request.
// On a cold start, module load and the first request arrive simultaneously — without
// awaiting this, openModal is called before Postgres is ready and Slack returns
// expired_trigger_id because the token lookup fails.
let _initError: unknown = null

function startInit(): Promise<void> {
  // Wrap in Promise.resolve().then() so synchronous throws from getBot()
  // (e.g. missing env vars) are captured as rejections rather than crashing
  // the module at evaluation time.
  return Promise.resolve()
    .then(() => getBot().initialize())
    .catch((err) => {
      console.error("[bot] init error:", err)
      _initError = err
    })
}

let _init = startInit()

// Called by the Vercel cron every 5 minutes to keep this function warm.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    // Vercel automatically injects Authorization: Bearer <CRON_SECRET> for cron
    // invocations — no header config needed in vercel.json.
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }
  // No CRON_SECRET: allow unauthenticated warmup (endpoint is non-sensitive;
  // set CRON_SECRET in production to restrict access).
  await _init
  if (_initError) {
    _initError = null
    _init = startInit()
    return new Response("Bot initialization failed", { status: 503 })
  }
  return new Response("ok")
}

export async function POST(request: NextRequest) {
  await _init
  if (_initError) {
    _initError = null
    _init = startInit()
    return new Response("Bot initialization failed", { status: 503 })
  }
  const body = await request.text()
  return getBot().webhooks.slack(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    }),
    {
      waitUntil: (p) =>
        after(async () => {
          await p
        }),
    },
  )
}
