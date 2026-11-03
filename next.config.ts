import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't write an AGENTS.md file into the project when running the dev server.
  agentRules: false,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
