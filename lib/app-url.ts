function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "")
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL)
    return stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
