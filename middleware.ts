// This is the routing brain.
// clifford.liveportfolio.site → rewrites to /portfolio/clifford
// liveportfolio.site → main app routes normally
import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'liveportfolio.site'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname } = req.nextUrl

  // Strip port for local dev
  const hostname = host.split(':')[0]

  // Local development: treat as main app
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next()
  }

  // Main domain: liveportfolio.site or www.liveportfolio.site → route normally
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    // Allow /{slug} on the main domain as a short link to /portfolio/{slug}
    // Example: https://liveportfolio.site/benedicta -> /portfolio/benedicta
    const normalizedPath =
      pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

    const isSingleSegment =
      normalizedPath.startsWith('/') &&
      normalizedPath.indexOf('/', 1) === -1 &&
      normalizedPath.length > 1

    if (isSingleSegment) {
      const slug = normalizedPath.slice(1)
      const reserved = new Set([
        'api',
        'auth',
        'blog',
        'create',
        'dashboard',
        'login',
        'portfolio',
        'preview',
        'privacy',
        'reset-password',
        'terms',
        'test-templates',
        '_next',
        'favicon.ico',
        'robots.txt',
        'sitemap.xml',
      ])

      const looksLikeFile = slug.includes('.')

      if (!reserved.has(slug) && !looksLikeFile) {
        const url = req.nextUrl.clone()
        url.pathname = `/portfolio/${slug}`
        return NextResponse.rewrite(url)
      }
    }

    return NextResponse.next()
  }

  // Subdomain: *.liveportfolio.site → rewrite to /portfolio/[slug]
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.replace(`.${ROOT_DOMAIN}`, '').toLowerCase()

    // Don't rewrite internal Next.js paths
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/favicon.ico') {
      return NextResponse.next()
    }

    const url = req.nextUrl.clone()
    url.pathname = `/portfolio/${slug}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
