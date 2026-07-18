/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/admin',
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',

      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin/login',
        basePath: false,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.BACKEND_URL || (isProd ? 'http://saas_backend:3001' : 'http://localhost:3001');
    return [
      {
        source: '/api/sso/:path*',
        destination: `${backendUrl}/sso/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;