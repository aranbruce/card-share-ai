import { afterEach, describe, expect, it, vi } from "vitest"
import { aiTelemetry } from "./ai-telemetry"

describe("aiTelemetry", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("disables telemetry when project token is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "")

    const { telemetry, runtimeContext } = aiTelemetry("generate-card-headline")

    expect(telemetry.isEnabled).toBe(false)
    expect(telemetry.functionId).toBe("generate-card-headline")
    expect(runtimeContext).toBeUndefined()
  })

  it("enables telemetry when project token is set", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test")

    const { telemetry } = aiTelemetry("generate-card-message")

    expect(telemetry.isEnabled).toBeUndefined()
    expect(telemetry.functionId).toBe("generate-card-message")
  })

  it("includes runtimeContext distinctId when distinct id is valid", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test")

    const { telemetry, runtimeContext } = aiTelemetry(
      "generate-card-cover-art",
      "user-abc",
    )

    expect(runtimeContext).toEqual({ distinctId: "user-abc" })
    expect(telemetry.includeRuntimeContext).toEqual({ distinctId: true })
  })

  it("omits runtimeContext for invalid distinct ids", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test")

    const { telemetry, runtimeContext } = aiTelemetry(
      "generate-card-cover-art",
      "",
    )

    expect(runtimeContext).toBeUndefined()
    expect(telemetry.includeRuntimeContext).toBeUndefined()
  })
})
