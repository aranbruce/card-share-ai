import { describe, expect, it } from "vitest"

import { normalizeGiphyUrl } from "./giphy-url"

describe("normalizeGiphyUrl", () => {
  it("returns null for null and undefined", () => {
    expect(normalizeGiphyUrl(null)).toBeNull()
    expect(normalizeGiphyUrl(undefined)).toBeNull()
  })

  it("returns null for empty and whitespace-only strings", () => {
    expect(normalizeGiphyUrl("")).toBeNull()
    expect(normalizeGiphyUrl("   ")).toBeNull()
  })

  it("returns undefined for non-string values", () => {
    expect(normalizeGiphyUrl(123)).toBeUndefined()
    expect(normalizeGiphyUrl(true)).toBeUndefined()
    expect(normalizeGiphyUrl({})).toBeUndefined()
  })

  it("returns undefined for invalid URLs", () => {
    expect(normalizeGiphyUrl("not-a-url")).toBeUndefined()
    expect(normalizeGiphyUrl("://bad")).toBeUndefined()
  })

  it("returns undefined for http URLs", () => {
    expect(normalizeGiphyUrl("http://giphy.com/gifs/abc")).toBeUndefined()
    expect(normalizeGiphyUrl("http://media.giphy.com/gifs/abc")).toBeUndefined()
  })

  it("accepts https giphy.com URLs", () => {
    expect(normalizeGiphyUrl("https://giphy.com/gifs/abc")).toBe(
      "https://giphy.com/gifs/abc",
    )
  })

  it("accepts https subdomains of giphy.com", () => {
    expect(
      normalizeGiphyUrl("https://media.giphy.com/media/abc/giphy.gif"),
    ).toBe("https://media.giphy.com/media/abc/giphy.gif")
    expect(
      normalizeGiphyUrl("https://media3.giphy.com/media/abc/giphy.gif"),
    ).toBe("https://media3.giphy.com/media/abc/giphy.gif")
  })

  it("returns undefined for non-giphy domains", () => {
    expect(normalizeGiphyUrl("https://evil.com/giphy.com/abc")).toBeUndefined()
    expect(normalizeGiphyUrl("https://notgiphy.com/gifs/abc")).toBeUndefined()
    expect(
      normalizeGiphyUrl("https://giphy.com.evil.com/gifs/abc"),
    ).toBeUndefined()
  })

  it("normalizes URLs via URL parsing (canonical form)", () => {
    const result = normalizeGiphyUrl("https://media.giphy.com/media/abc/../abc/giphy.gif")
    expect(result).toBeTruthy()
    expect(result).not.toContain("..")
  })
})
