import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@initia/initia.js"],
  // Allow enough time for WASM upload + confirmation polling (2 txs, ~60s each)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
