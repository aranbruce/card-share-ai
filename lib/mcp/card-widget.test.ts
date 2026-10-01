import { readFileSync } from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { describe, expect, it } from "vitest"
import {
  APP_SDK_BUNDLE_PATH,
  buildCardWidgetHtml,
  exposeBundleExports,
} from "@/lib/mcp/card-widget"

describe("exposeBundleExports", () => {
  it("turns the trailing export into a global", () => {
    const out = exposeBundleExports(
      "var a=1;var b=2;export{a as App,b};",
      "Sdk",
    )
    const context: { globalThis?: unknown; Sdk?: unknown } = {}
    context.globalThis = context
    vm.runInNewContext(out, context)
    expect(context.Sdk).toEqual({ App: 1, b: 2 })
  })

  it("finds App in the real MCP Apps bundle", () => {
    const source = readFileSync(
      path.join(process.cwd(), APP_SDK_BUNDLE_PATH),
      "utf8",
    )
    const out = exposeBundleExports(source, "Sdk")
    expect(out).not.toMatch(/export\s*\{/)
    expect(out).toMatch(/"App":\w+/)
  })
})

describe("buildCardWidgetHtml", () => {
  it("inlines the SDK and the view script", async () => {
    const html = await buildCardWidgetHtml()
    expect(html.startsWith("<!doctype html>")).toBe(true)
    expect(html).toContain("globalThis.CardShareMcpApps=")
    expect(html).toContain("app.ontoolresult = render")
    // Exactly the two scripts we add; nothing inlined closes a tag early
    expect(html.match(/<\/script>/g)).toHaveLength(2)
  })
})
