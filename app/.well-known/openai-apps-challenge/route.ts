/**
 * OpenAI's domain check for publishing the ChatGPT app: serves the challenge
 * token from the Plugins dashboard as plain text, as it requires.
 */
export function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE_TOKEN?.trim()
  if (!token) return new Response("Not found", { status: 404 })
  return new Response(token, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
