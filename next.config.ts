import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],

  // Security: Limit request body size to prevent DoS attacks
  // 50MB max for uploads (Caddy enforces 50MB limit too)
  api: {
    bodyParser: {
      sizeLimit: '50MB',
    },
  },
}

export default nextConfig
