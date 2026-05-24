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
    return NextResponse.next()
  }

  // Subdomain: *.liveportfolio.site → rewrite to /portfolio/[slug]
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.replace(`.${ROOT_DOMAIN}`, '')

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
