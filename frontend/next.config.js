const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isExport = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations - only use export for production builds
  ...(isExport && { output: 'export' }),
  poweredByHeader: false,
  compress: true,
  trailingSlash: true,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Strip console.log/debug/warn in production builds
  compiler: {
    removeConsole: isExport ? { exclude: ['error'] } : false,
  },
  
  // Webpack configuration to polyfill localStorage for SSR
  webpack: (config, { isServer, webpack }) => {
    // Fix for React Server Components module loading issue
    config.resolve.extensionAlias = {
      '.js': ['.js', '.tsx', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
      '.ts': ['.ts', '.tsx'],
      '.tsx': ['.tsx', '.ts', '.js'],
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
    
    return config;
  },
  
  experimental: {
    optimizeCss: true,
    reactCompiler: false,
  },
  
  serverExternalPackages: ['@tanstack/react-query'],
  
  // Rewrites only in development (not compatible with static export)
  ...(!isExport && {
    async rewrites() {
      return [
        {
          source: '/api/django/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    },
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-DNS-Prefetch-Control', value: 'on' },
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          ],
        },
      ];
    },
  }),
  
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
  
  serverExternalPackages: [],
  
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = withBundleAnalyzer(nextConfig);
