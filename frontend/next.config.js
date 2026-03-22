const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Webpack configuration to polyfill localStorage for SSR
  webpack: (config, { isServer, webpack }) => {
    // Fix for React Server Components module loading issue
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        localStorage: false,
      };
      
      // Add a plugin to polyfill localStorage for SSR
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof localStorage': JSON.stringify('object'),
          'localStorage': JSON.stringify({
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
          }),
        })
      );
    }
    
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8': 'utf-8',
    });
    
    return config;
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.sikaremit.com',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = withBundleAnalyzer(nextConfig);
