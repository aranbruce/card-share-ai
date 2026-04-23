export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Typed fetch wrapper for internal API routes.
 * - Always sends credentials (session cookies)
 * - Throws ApiError on non-2xx responses
 * - Throws on JSON parse failure instead of returning empty object
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (typeof body.error === "string") message = body.error
    } catch {
      // ignore parse errors on error responses
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }

  return res.json() as Promise<T>
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function apiDelete(url: string): Promise<void> {
  return apiFetch<void>(url, { method: "DELETE" })
}
