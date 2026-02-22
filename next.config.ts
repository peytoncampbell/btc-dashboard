import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/dash',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
