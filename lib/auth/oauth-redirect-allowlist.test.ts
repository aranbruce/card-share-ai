import { describe, expect, it } from "vitest"
import { isAllowedOAuthRedirect } from "@/lib/auth/oauth-redirect-allowlist"

describe("isAllowedOAuthRedirect", () => {
  it.each([
    "https://chatgpt.com/connector/oauth/TxwB2svF_6oV",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://claude.ai/api/mcp/auth_callback",
    "http://127.0.0.1/callback/XuuuHAzzHOni",
    "http://127.0.0.1:53682/callback",
    "http://localhost:8080/oauth",
    "http://[::1]:3000/cb",
  ])("allows %s", (uri) => {
    expect(isAllowedOAuthRedirect(uri)).toBe(true)
  })

  it.each([
    // Look-alike or attacker-controlled hosts
    "https://evil.example/callback",
    "https://chatgpt.com.evil.example/connector/oauth/abc",
    "https://evilchatgpt.com/connector/oauth/abc",
    "https://claude.ai.evil.example/api/mcp/auth_callback",
    // Right host, wrong path or scheme
    "https://chatgpt.com/somewhere-else",
    "https://chatgpt.com/connector/oauth/abc/extra",
    "https://claude.ai/api/mcp/auth_callback/../x",
    "http://chatgpt.com/connector_platform_oauth_redirect",
    "https://chatgpt.com:8443/connector_platform_oauth_redirect",
    "https://user:pass@claude.ai/api/mcp/auth_callback",
    // Plain http only for loopback
    "http://192.168.1.10/callback",
    "http://127.0.0.1.evil.example/callback",
    "javascript:alert(1)",
    "not a url",
    "",
  ])("refuses %s", (uri) => {
    expect(isAllowedOAuthRedirect(uri)).toBe(false)
  })
})
