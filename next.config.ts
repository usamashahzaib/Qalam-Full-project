import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  compress: true,
  pageExtensions: ["ts", "tsx"],
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: "/privacy",
        destination: "/legal/privacy",
        permanent: true,
      },
    ]
  },

  async headers() {
    // Security headers (CSP, X-Frame-Options, etc.) are set per-request in
    // proxy.ts so they can carry a unique nonce. Only the API cache-control
    // header lives here because it must also cover routes that skip the proxy.
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
    ]
  },

  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
}

export default nextConfig
