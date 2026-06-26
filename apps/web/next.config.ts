import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sehatvault/core", "@sehatvault/i18n", "@sehatvault/ui"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
