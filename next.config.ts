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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.dev",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev",
              "img-src 'self' https://*.clerk.accounts.dev https://img.clerk.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev",
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
