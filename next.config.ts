import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 1 of the z-design port: let the build through while we graft the real
  // backend onto z's frontend. Tightened back up once wiring is complete.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "sfile.chatglm.cn" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
