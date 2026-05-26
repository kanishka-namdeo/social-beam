import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@phosphor-icons/react", "cloakbrowser", "playwright-core", "crawlee", "@crawlee/*"],
  // bodySizeLimit configured for 10MB uploads (Server Actions default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
