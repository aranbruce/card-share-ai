import { describe, expect, it } from "vitest"
import {
  buildLoginRedirectUrl,
  resolveSafePostAuthRedirectPath,
} from "./safe-redirect-path"

describe("resolveSafePostAuthRedirectPath", () => {
  it("returns fallback for null, undefined, or empty", () => {
    expect(resolveSafePostAuthRedirectPath(null)).toBe("/dashboard")
    expect(resolveSafePostAuthRedirectPath(undefined)).toBe("/dashboard")
    expect(resolveSafePostAuthRedirectPath("")).toBe("/dashboard")
  })

  it("allows root-relative paths", () => {
    expect(resolveSafePostAuthRedirectPath("/create")).toBe("/create")
    expect(resolveSafePostAuthRedirectPath("/create?foo=1")).toBe(
      "/create?foo=1",
    )
  })

  it("rejects protocol-relative and absolute URLs", () => {
    expect(resolveSafePostAuthRedirectPath("//evil.com")).toBe("/dashboard")
    expect(resolveSafePostAuthRedirectPath("https://evil.com")).toBe(
      "/dashboard",
    )
  })

  it("rejects backslash and whitespace tricks that resolve off-origin", () => {
    for (const path of ["/\\evil.com", "/\\/evil.com", "/\t/evil.com"]) {
      expect(resolveSafePostAuthRedirectPath(path)).toBe("/dashboard")
    }
  })

  it("respects custom fallback", () => {
    expect(resolveSafePostAuthRedirectPath(null, "/login")).toBe("/login")
  })
})

describe("buildLoginRedirectUrl", () => {
  it("encodes the requested path as a redirect query param", () => {
    expect(buildLoginRedirectUrl("/dashboard/cards/123")).toBe(
      "/login?redirect=%2Fdashboard%2Fcards%2F123",
    )
  })

  it("falls back to dashboard when the path is missing or unsafe", () => {
    expect(buildLoginRedirectUrl(null)).toBe("/login?redirect=%2Fdashboard")
    expect(buildLoginRedirectUrl("https://evil.com")).toBe(
      "/login?redirect=%2Fdashboard",
    )
  })
})
