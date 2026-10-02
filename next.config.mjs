/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.giphy.com" },
    ],
  },
  // PostHog proxy is handled in proxy.ts (Host header required for /static/* scripts).
  skipTrailingSlashRedirect: true,
  // Occasion preview images are re-rendered on the server (weekly) from the cover art.
  outputFileTracingIncludes: {
    "/og/occasion/[slug]": ["./public/occasions/*.webp"],
    // Funny photo template layout references, read by lib/card-template-scenes.ts
    "/api/generate-image": ["./assets/template-layouts/*.webp"],
    // Inlined into the MCP Apps card view (lib/mcp/card-widget.ts)
    "/mcp": [
      "./node_modules/@modelcontextprotocol/ext-apps/dist/src/app-with-deps.js",
    ],
  },
  // Belt-and-braces with robots.txt: if a card URL is linked publicly, Google
  // can still discover it — noindex drops it instead of indexing a bare URL.
  async headers() {
    return [
      {
        source: "/view/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/contribute/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
  },
}

export default nextConfig
