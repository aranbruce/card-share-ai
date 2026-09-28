import { describe, expect, it } from "vitest"
import { getMessagesTabOpen } from "./slack-app-home"

const appHomeOpened = (event: object, extra: object = {}) =>
  JSON.stringify({
    type: "event_callback",
    team_id: "T123",
    event: { type: "app_home_opened", user: "U1", channel: "D1", ...event },
    ...extra,
  })

describe("getMessagesTabOpen", () => {
  it("returns details when the Messages tab is opened", () => {
    expect(getMessagesTabOpen(appHomeOpened({ tab: "messages" }))).toEqual({
      installationId: "T123",
      teamId: "T123",
      userId: "U1",
      channelId: "D1",
    })
  })

  it("uses the enterprise ID as the installation for org-wide installs", () => {
    expect(
      getMessagesTabOpen(
        appHomeOpened(
          { tab: "messages" },
          { enterprise_id: "E456", is_enterprise_install: true },
        ),
      ),
    ).toMatchObject({ installationId: "E456", teamId: "T123" })
  })

  it("ignores the Home tab, other events and invalid payloads", () => {
    expect(getMessagesTabOpen(appHomeOpened({ tab: "home" }))).toBeNull()
    expect(
      getMessagesTabOpen(
        JSON.stringify({
          type: "event_callback",
          team_id: "T123",
          event: { type: "message", user: "U1", channel: "D1" },
        }),
      ),
    ).toBeNull()
    expect(getMessagesTabOpen("payload=%7B%7D")).toBeNull()
  })
})
