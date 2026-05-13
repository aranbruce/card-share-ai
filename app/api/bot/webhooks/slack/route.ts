import { getBot } from "@/lib/bot"
import type { NextRequest } from "next/server"

export const maxDuration = 60

// Store the initialization promise so we can await it before the first request.
// On a cold start, module load and the first request arrive simultaneously — without
// awaiting this, openModal is called before Postgres is ready and Slack returns
// expired_trigger_id because the token lookup fails.
const _init = getBot()
  .initialize()
  .catch((err) => console.error("[bot] init error:", err))

// Called by the Vercel cron every 5 minutes to keep this function warm.
export async function GET() {
  await _init
  return new Response("ok")
}

export async function POST(request: NextRequest) {
  await _init
  const body = await request.text()
  return getBot().webhooks.slack(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    }),
  )
}
