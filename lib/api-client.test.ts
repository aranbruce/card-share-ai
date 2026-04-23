import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiFetch, apiDelete, apiPatch, apiPost } from "./api-client"

function makeFetchMock(
  status: number,
  body: unknown,
  { ok = status >= 200 && status < 300 } = {},
) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    headers: { get: () => null },
    json: vi.fn().mockResolvedValue(body),
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", makeFetchMock(200, { data: "ok" }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("apiFetch", () => {
  it("always sends credentials: same-origin", async () => {
    await apiFetch("/api/test")
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init).toMatchObject({ credentials: "same-origin" })
  })

  it("returns parsed JSON on 2xx", async () => {
    const result = await apiFetch<{ data: string }>("/api/test")
    expect(result).toEqual({ data: "ok" })
  })

  it("throws ApiError with status on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock(404, { error: "Not found" }, { ok: false }),
    )
    await expect(apiFetch("/api/test")).rejects.toBeInstanceOf(ApiError)
  })

  it("parses error body { error } into ApiError message", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock(422, { error: "Validation failed" }, { ok: false }),
    )
    const err = await apiFetch("/api/test").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe("Validation failed")
    expect((err as ApiError).status).toBe(422)
  })

  it("uses fallback message when error body has no { error } field", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock(500, { detail: "oops" }, { ok: false }),
    )
    const err = await apiFetch("/api/test").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toMatch("500")
  })

  it("uses fallback message when error body JSON is unparseable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      }),
    )
    const err = await apiFetch("/api/test").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(503)
  })

  it("sets Content-Type header when a body is present", async () => {
    await apiFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ x: 1 }),
    })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((init.headers as Headers).get("Content-Type")).toBe(
      "application/json",
    )
  })

  it("does not set Content-Type when no body", async () => {
    await apiFetch("/api/test")
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((init.headers as Headers).get("Content-Type")).toBeNull()
  })

  it("enforces credentials: same-origin even when caller provides different credentials", async () => {
    await apiFetch("/api/test", { credentials: "omit" })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.credentials).toBe("same-origin")
  })
})

describe("apiPost", () => {
  it("sends method POST with JSON-serialised body", async () => {
    vi.stubGlobal("fetch", makeFetchMock(201, {}))
    await apiPost("/api/cards", { title: "Hello" })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ title: "Hello" }))
  })
})

describe("apiPatch", () => {
  it("sends method PATCH with JSON-serialised body", async () => {
    await apiPatch("/api/cards/1", { title: "Updated" })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe("PATCH")
    expect(init.body).toBe(JSON.stringify({ title: "Updated" }))
  })
})

describe("apiDelete", () => {
  it("sends method DELETE and resolves on 204 without parsing a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
        json: vi.fn().mockRejectedValue(new SyntaxError("no body")),
      }),
    )
    await expect(apiDelete("/api/cards/1")).resolves.toBeUndefined()
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe("DELETE")
  })
})
