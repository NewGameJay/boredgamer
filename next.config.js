/** @type {import('next').NextConfig} */
const nextConfig = {
  // Domain configuration
  async rewrites() {
    return [];
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TS errors during build
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors during build
  },
  experimental: {
    serverActions: true
  },
  transpilePackages: ['undici', '@firebase/auth', 'firebase', 'firebase/auth'],
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `undici` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
        encoding: false,
        'supports-color': false,
      };
    }

    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

module.exports = nextConfig;
