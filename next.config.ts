import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Improve compatibility with paths containing spaces (like OneDrive paths)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Use a more stable source map for development
      // This avoids issues with eval-source-map and paths containing spaces
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
};

export default nextConfig;
