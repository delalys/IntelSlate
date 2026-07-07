import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Fonts are CORS-restricted; capture services (TRMNL) re-render the
        // page HTML from another origin and need them cross-origin
        source: '/fonts/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
