import { describe, expect, it } from "vitest"
import { resolveSafePostAuthRedirectPath } from "./safe-redirect-path"

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

  it("respects custom fallback", () => {
    expect(resolveSafePostAuthRedirectPath(null, "/login")).toBe("/login")
  })
})
