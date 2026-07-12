/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@he-system/shared', '@he-system/database'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
}

module.exports = nextConfig
