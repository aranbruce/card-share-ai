import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_HEADLINE_MODEL,
  DEFAULT_MESSAGE_MODEL,
  getHeadlineModel,
  getMessageModel,
} from "./ai-text-model"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("text models", () => {
  it("use the defaults when no override is set", () => {
    vi.stubEnv("AI_HEADLINE_MODEL", "")
    vi.stubEnv("AI_MESSAGE_MODEL", "")
    expect(getHeadlineModel()).toBe(DEFAULT_HEADLINE_MODEL)
    expect(getMessageModel()).toBe(DEFAULT_MESSAGE_MODEL)
  })

  it("override headlines and messages independently", () => {
    vi.stubEnv("AI_HEADLINE_MODEL", " anthropic/claude-opus-5.5 ")
    vi.stubEnv("AI_MESSAGE_MODEL", "")
    expect(getHeadlineModel()).toBe("anthropic/claude-opus-5.5")
    expect(getMessageModel()).toBe(DEFAULT_MESSAGE_MODEL)
  })
})
