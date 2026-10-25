import type { NextConfig } from 'next'

// The Image Optimization API (/_next/image) fetches and re-encodes whatever the patterns below allow, and it has had critical
// remote-code-execution advisories for SVG and AVIF input (fixed in 15.5.28). Defence in depth: allow the minimum, and keep SVG
// and AVIF off. Everything users upload lives in THIS project's public storage (the upload routes force JPEG), so the pattern
// is this project's exact host, not every *.supabase.co project, which would let anyone host an image on their own project
// and have our server fetch it.
function supabasePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return []
  try {
    const u = new URL(raw)
    return [{
      protocol: u.protocol.replace(':', '') as 'http' | 'https',
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: '/storage/v1/object/public/**',
    }]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  // Optional local validation output: do not race an existing dev server in .next.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      ...supabasePattern(),
      // only the internal /test-templates page uses this host
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // api.qrserver.com is NOT listed: the QR codes are plain <img> tags that never go through the optimizer
    ],
    formats: ['image/webp'], // AVIF stays off (this is also Next's default, written down on purpose)
    dangerouslyAllowSVG: false, // SVG stays off (default, written down on purpose)
  },
  async headers() {
    return [
      {
        // Portfolio pages served via subdomain rewrite — allow same-origin framing
        source: '/portfolio/:slug',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig
