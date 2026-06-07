import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  pageExtensions: ["ts", "tsx"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self' https://*.linkedin.com https://*.licdn.com",
              "img-src 'self' data: blob: https://*.linkedin.com https://*.licdn.com",
              "frame-src 'self' https://*.linkedin.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;