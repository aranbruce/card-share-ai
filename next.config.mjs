/** @type {import('next').NextConfig} */
const nextConfig = {
  // LAN access (e.g. phone on same Wi‑Fi) — update if your machine’s IP changes
  allowedDevOrigins: ["192.168.86.22"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.giphy.com" },
    ],
  },
}

export default nextConfig
