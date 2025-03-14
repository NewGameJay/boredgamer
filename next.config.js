/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: true
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `undici` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
      };
    }

    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    
    // Add transpilePackages to handle private class fields
    config.transpilePackages = [
      'undici',
      '@firebase/auth',
      'firebase',
      'firebase/auth'
    ];

    return config;
  },
};

module.exports = nextConfig;
