import { existsSync } from 'node:fs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Hero videosu: dosyalar /public/video içinde varsa derleme sırasında otomatik algılanır.
  env: {
    NEXT_PUBLIC_HERO_WEBM: existsSync('public/video/hero.webm') ? '1' : '',
    NEXT_PUBLIC_HERO_MP4: existsSync('public/video/hero.mp4') ? '1' : '',
  },
  serverExternalPackages: ['postgres'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Yönetim sayfaları arama motorlarına kapalı
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};
export default nextConfig;
