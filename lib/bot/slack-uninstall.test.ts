import { describe, expect, it } from "vitest"
import { getUninstalledSlackInstallationId } from "./slack-uninstall"

const eventCallback = (event: object, extra: object = {}) =>
  JSON.stringify({ type: "event_callback", team_id: "T123", event, ...extra })

describe("getUninstalledSlackInstallationId", () => {
  it("returns the team ID for app_uninstalled", () => {
    expect(
      getUninstalledSlackInstallationId(
        eventCallback({ type: "app_uninstalled" }),
      ),
    ).toBe("T123")
  })

  it("returns the team ID when bot tokens are revoked", () => {
    expect(
      getUninstalledSlackInstallationId(
        eventCallback({ type: "tokens_revoked", tokens: { bot: ["U999"] } }),
      ),
    ).toBe("T123")
  })

  it("ignores tokens_revoked with only user tokens", () => {
    expect(
      getUninstalledSlackInstallationId(
        eventCallback({
          type: "tokens_revoked",
          tokens: { oauth: ["U1"], bot: [] },
        }),
      ),
    ).toBeNull()
  })

  it("uses the enterprise ID for org-wide installs", () => {
    expect(
      getUninstalledSlackInstallationId(
        eventCallback(
          { type: "app_uninstalled" },
          { enterprise_id: "E456", is_enterprise_install: true },
        ),
      ),
    ).toBe("E456")
  })

  it("ignores other events, non-event payloads and invalid JSON", () => {
    expect(
      getUninstalledSlackInstallationId(eventCallback({ type: "message" })),
    ).toBeNull()
    expect(
      getUninstalledSlackInstallationId(
        JSON.stringify({ type: "url_verification", challenge: "x" }),
      ),
    ).toBeNull()
    expect(getUninstalledSlackInstallationId("payload=%7B%7D")).toBeNull()
  })
})
