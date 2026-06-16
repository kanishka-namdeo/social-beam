import type { NextConfig } from "next";

// Bundle analyzer wrapper — activated via ANALYZE=true env var
// Usage: ANALYZE=true pnpm build
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "cloakbrowser",
    "playwright-core",
    "crawlee",
    "@crawlee/*",
    "@opentelemetry/sdk-node",
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/exporter-trace-otlp-http",
  ],
  // bodySizeLimit configured for 10MB uploads (Server Actions default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          {
            key: "Content-Security-Policy",
            value: (() => {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
              const appWs = appUrl.replace(/^http/, 'ws');
              const connectSrc = [
                "'self'",
                "https://api.openai.com",
                "https://api.stripe.com",
                "https://api.resend.com",
                "https://*.sentry.io",
                "https://api.linkedin.com",
                "https://api.twitter.com",
                "https://api.x.com",
                "https://api.pinterest.com",
                "https://www.reddit.com",
                "https://api.unsplash.com",
                "https://api.pexels.com",
                "https://api.giphy.com",
                "wss:",
              ];
              if (appWs) connectSrc.push(appWs);
              if (process.env.NODE_ENV !== "production") {
                connectSrc.push("ws://localhost:*", "http://localhost:*");
              }
              return [
                "default-src 'self'",
                // 'unsafe-inline' required for Next.js hydration scripts; 'unsafe-eval' only in dev for HMR
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                `connect-src ${connectSrc.join(" ")}`,
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
              ].join("; ");
            })(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
