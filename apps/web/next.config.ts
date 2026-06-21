import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sehatvault/core", "@sehatvault/i18n"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
