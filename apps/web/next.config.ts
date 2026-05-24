import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

if (!process.env.VERCEL) {
  nextConfig.outputFileTracingRoot = path.join(__dirname, "../..");
}

export default nextConfig;
