import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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

export default nextConfig
