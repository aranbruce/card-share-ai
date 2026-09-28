/**
 * Returns the installation ID (team ID, or enterprise ID for org-wide installs)
 * when a Slack Events API payload means our bot can no longer act in that
 * workspace: `app_uninstalled`, or `tokens_revoked` including bot tokens.
 * Returns null for anything else.
 */
export function getUninstalledSlackInstallationId(body: string): string | null {
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
    event?: { type?: unknown; tokens?: { bot?: unknown } }
  }
  if (p.type !== "event_callback" || !p.event) return null

  const eventType = p.event.type
  const isUninstall =
    eventType === "app_uninstalled" ||
    (eventType === "tokens_revoked" &&
      Array.isArray(p.event.tokens?.bot) &&
      p.event.tokens.bot.length > 0)
  if (!isUninstall) return null

  const id = p.is_enterprise_install === true ? p.enterprise_id : p.team_id
  return typeof id === "string" && id ? id : null
}
