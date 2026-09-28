export const SLACK_HELP_MESSAGE = [
  "Hi! I'm CardShare.ai. I create AI-generated group greeting cards your team can sign together.",
  "",
  "• `/cardshareai-link` connects your CardShare.ai account (you only need to do this once)",
  "• `/cardshareai` opens a form to create a card: pick the occasion, recipient and tone, and I'll write a headline and make a cover image",
  "",
  "When your card is ready, I'll send you a link to open it and a contributor link your teammates can use to add messages and GIFs.",
  "",
  "Run either command in any channel or right here.",
].join("\n")

export interface MessagesTabOpen {
  installationId: string
  teamId: string
  userId: string
  channelId: string
}

/**
 * Returns details when a Slack Events API payload is an `app_home_opened`
 * event for the Messages tab, otherwise null. The Slack adapter only handles
 * the Home tab, so we detect this one ourselves to send a welcome message.
 */
export function getMessagesTabOpen(body: string): MessagesTabOpen | null {
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }
  if (!payload || typeof payload !== "object") return null

  const p = payload as {
    type?: unknown
    team_id?: unknown
    enterprise_id?: unknown
    is_enterprise_install?: unknown
    event?: { type?: unknown; tab?: unknown; user?: unknown; channel?: unknown }
  }
  if (p.type !== "event_callback" || !p.event) return null
  const { type, tab, user, channel } = p.event
  if (type !== "app_home_opened" || tab !== "messages") return null
  if (typeof user !== "string" || typeof channel !== "string") return null
  if (typeof p.team_id !== "string" || !p.team_id) return null

  const installationId =
    p.is_enterprise_install === true && typeof p.enterprise_id === "string"
      ? p.enterprise_id
      : p.team_id
  return { installationId, teamId: p.team_id, userId: user, channelId: channel }
}
