import { getBot } from "@/lib/bot"
import { after } from "next/server"
import type { NextRequest } from "next/server"

export const maxDuration = 60

// Slack's trigger_id (and ack) deadline is 3 seconds. Leave 500ms buffer for
// the actual handler to run before we bail with 503 rather than waiting for
// the full retry schedule (which can exceed 3.5s on repeated cold-start failures).
const SLACK_DEADLINE_MS = 2500

// Store the initialization promise so we can await it before the first request.
// On a cold start, module load and the first request arrive simultaneously — without
// awaiting this, openModal is called before Postgres is ready and Slack returns
// expired_trigger_id because the token lookup fails.
let _initError: unknown = null

const INIT_MAX_ATTEMPTS = 4
const INIT_RETRY_BASE_MS = 500

function startInit(): Promise<void> {
  // Wrap in Promise.resolve().then() so synchronous throws from getBot()
  // (e.g. missing env vars) are captured as rejections rather than crashing
  // the module at evaluation time.
  return Promise.resolve().then(async () => {
    for (let attempt = 1; attempt <= INIT_MAX_ATTEMPTS; attempt++) {
      try {
        await getBot().initialize()
        return
      } catch (err) {
        const isLast = attempt === INIT_MAX_ATTEMPTS
        if (isLast) {
          console.error("[bot] init error:", err)
          _initError = err
          return
        }
        const delay = INIT_RETRY_BASE_MS * 2 ** (attempt - 1)
        console.warn(
          `[bot] init attempt ${attempt} failed, retrying in ${delay}ms:`,
          err,
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
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
  let timedOut = false
  const deadline = new Promise<void>((resolve) =>
    setTimeout(() => {
      timedOut = true
      resolve()
    }, SLACK_DEADLINE_MS),
  )
  await Promise.race([_init, deadline])
  if (timedOut) {
    return new Response("Bot initialization timed out", { status: 503 })
  }
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
