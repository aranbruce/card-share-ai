import { describe, expect, it } from "vitest"

import { stripSurroundingQuotes } from "./strip-surrounding-quotes"

describe("stripSurroundingQuotes", () => {
  it("removes one layer of matching straight quotes", () => {
    expect(stripSurroundingQuotes('  "hello world"  ')).toBe("hello world")
    expect(stripSurroundingQuotes("  'hello world'  ")).toBe("hello world")
  })

  it("removes one layer of matching curly quotes", () => {
    expect(stripSurroundingQuotes("  “hello world” ")).toBe("hello world")
    expect(stripSurroundingQuotes("  ‘hello world’ ")).toBe("hello world")
  })

  it("keeps mismatched surrounding quotes", () => {
    expect(stripSurroundingQuotes("\"hello world'")).toBe("\"hello world'")
  })

  it("strips only one surrounding layer", () => {
    expect(stripSurroundingQuotes("\"'hello world'\"")).toBe("'hello world'")
  })
})
