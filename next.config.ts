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
              "connect-src 'self'",
              "img-src 'self' data: blob:",
              "frame-src 'self'",
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
