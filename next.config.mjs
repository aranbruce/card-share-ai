/** @type {import('next').NextConfig} */
const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const nextConfig = {
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.giphy.com" },
    ],
  },
}

export default nextConfig
