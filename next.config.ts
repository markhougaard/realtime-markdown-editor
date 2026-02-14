import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'yjs', 'y-websocket', 'y-codemirror.next'],
  // Note: Request body size limits are enforced by Caddy reverse proxy (50MB max)
  // This is sufficient for security since the limit is applied at the network layer
}

export default nextConfig
