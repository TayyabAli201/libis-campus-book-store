import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@libsql/client"],
  turbopack: {
    resolveAlias: { "@bookstore-runtime": "./lib/server/runtime-vercel.ts" },
  },
  webpack(config) {
    config.resolve.alias["@bookstore-runtime"] = path.resolve(
      "lib/server/runtime-vercel.ts",
    );
    return config;
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(self)",
      },
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
            {
              key: "Content-Security-Policy",
              // Google AdSense CSP entries:
              // - script-src: pagead2.googlesyndication.com, googleads.g.doubleclick.net, *.google.com for AdSense script loading
              // - frame-src: pagead2.googlesyndication.com, googleads.g.doubleclick.net, tpc.googlesyndication.com for ad iframes
              // - img-src: pagead2.googlesyndication.com, googleads.g.doubleclick.net, tpc.googlesyndication.com, *.doubleclick.net for ad creatives & tracking pixels
              // - connect-src: pagead2.googlesyndication.com, googleads.g.doubleclick.net for ad auction telemetry and bid responses
              value:
                "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.google.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.googleusercontent.com https://*.openstreetmap.org https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net; font-src 'self' data:; connect-src 'self' https://*.google.com https://*.googleapis.com https://*.gstatic.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; frame-src 'self' https://maps.google.com https://www.google.com https://*.google.com https://*.openstreetmap.org https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
            },
          ]
        : []),
    ];
    return [{ source: "/:path*", headers: security }];
  },
};

export default nextConfig;
