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

  it("rejects giphy.com page URLs (not CDN asset hosts)", () => {
    expect(normalizeGiphyUrl("https://giphy.com/gifs/abc")).toBeUndefined()
    expect(normalizeGiphyUrl("https://giphy.com/stickers/abc")).toBeUndefined()
  })

  it("accepts https media*.giphy.com CDN URLs", () => {
    expect(
      normalizeGiphyUrl("https://media.giphy.com/media/abc/giphy.gif"),
    ).toBe("https://media.giphy.com/media/abc/giphy.gif")
    expect(
      normalizeGiphyUrl("https://media0.giphy.com/media/abc/200w.gif"),
    ).toBe("https://media0.giphy.com/media/abc/200w.gif")
    expect(
      normalizeGiphyUrl("https://media3.giphy.com/media/abc/giphy.gif"),
    ).toBe("https://media3.giphy.com/media/abc/giphy.gif")
  })

  it("rejects non-media subdomains of giphy.com", () => {
    expect(normalizeGiphyUrl("https://giphy.com/gifs/abc")).toBeUndefined()
    expect(normalizeGiphyUrl("https://api.giphy.com/v1/gifs")).toBeUndefined()
    expect(normalizeGiphyUrl("https://www.giphy.com/gifs/abc")).toBeUndefined()
  })

  it("returns undefined for non-giphy domains", () => {
    expect(normalizeGiphyUrl("https://evil.com/giphy.com/abc")).toBeUndefined()
    expect(normalizeGiphyUrl("https://notgiphy.com/gifs/abc")).toBeUndefined()
    expect(
      normalizeGiphyUrl("https://giphy.com.evil.com/gifs/abc"),
    ).toBeUndefined()
  })

  it("rejects URLs with embedded credentials", () => {
    expect(
      normalizeGiphyUrl("https://user:pass@media.giphy.com/media/abc/giphy.gif"),
    ).toBeUndefined()
    expect(
      normalizeGiphyUrl("https://user@media.giphy.com/media/abc/giphy.gif"),
    ).toBeUndefined()
  })

  it("rejects URLs with a non-default HTTPS port", () => {
    expect(
      normalizeGiphyUrl("https://media.giphy.com:444/media/abc/giphy.gif"),
    ).toBeUndefined()
    expect(
      normalizeGiphyUrl("https://media.giphy.com:8443/media/abc/giphy.gif"),
    ).toBeUndefined()
  })

  it("normalizes URLs via URL parsing (canonical form)", () => {
    const result = normalizeGiphyUrl("https://media.giphy.com/media/abc/../abc/giphy.gif")
    expect(result).toBeTruthy()
    expect(result).not.toContain("..")
  })
})
