export type OAuthProviderId = "google" | "github"

export function isOAuthProviderId(
  value: string | null,
): value is OAuthProviderId {
  return value === "google" || value === "github"
}

export function oauthProviderLabel(id: OAuthProviderId): string {
  return id === "google" ? "Google" : "GitHub"
}
