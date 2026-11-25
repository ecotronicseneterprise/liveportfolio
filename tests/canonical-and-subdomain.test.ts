// One address per portfolio: liveportfolio.site/<name> is the canonical one (the dashboard shares it); the name.liveportfolio.site form, when the
// wildcard DNS works, must not split search ranking and must still serve the site's own robots.txt and sitemap.xml.
import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ users: [{ slug: 'cliffordnwanna', published_at: '2026-01-01' }] as Array<{ slug: string; published_at: string }> }))
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        neq: () => ({ not: async () => ({ data: h.users }) }),
      }),
    }),
  }),
}))

import { middleware } from '@/middleware'
import sitemap from '@/app/sitemap'

const rewriteOf = (res: Response) => res.headers.get('x-middleware-rewrite')
const call = (host: string, path: string) => middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }))

describe('subdomain routing', () => {
  it('the portfolio page of a subdomain still rewrites to /portfolio/<name>', () => {
    expect(rewriteOf(call('cliffordnwanna.liveportfolio.site', '/'))).toMatch(/\/portfolio\/cliffordnwanna$/)
    expect(rewriteOf(call('cliffordnwanna.liveportfolio.site', '/anything'))).toMatch(/\/portfolio\/cliffordnwanna\/anything$/)
  })
  it('robots.txt and sitemap.xml on a subdomain are the site\'s own files, never rewritten to a portfolio path', () => {
    for (const p of ['/robots.txt', '/sitemap.xml']) {
      const res = call('cliffordnwanna.liveportfolio.site', p)
      expect(rewriteOf(res), p).toBeNull()
      expect(res.headers.get('x-middleware-next'), p).toBe('1')
    }
  })
  it('the main domain short link is unchanged', () => {
    expect(rewriteOf(call('liveportfolio.site', '/cliffordnwanna'))).toMatch(/\/portfolio\/cliffordnwanna$/)
    expect(rewriteOf(call('liveportfolio.site', '/robots.txt'))).toBeNull()
  })
})

describe('one canonical address', () => {
  it('the sitemap lists each portfolio once, as liveportfolio.site/<name>, never the subdomain form', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://liveportfolio.site/cliffordnwanna')
    expect(urls.filter((u) => /^https:\/\/[^/]+\.liveportfolio\.site/.test(u))).toEqual([])
    expect(urls.filter((u) => u.includes('cliffordnwanna'))).toHaveLength(1)
  })
  it('every portfolio page declares the liveportfolio.site/<name> canonical, whichever host served it', async () => {
    const src = (await import('node:fs')).readFileSync((await import('node:path')).resolve(__dirname, '../app/portfolio/[slug]/page.tsx'), 'utf8')
    expect(src).toMatch(/const canonicalUrl = `\$\{appUrl\}\/\$\{slug\}`/)
    expect(src).toMatch(/alternates:\s*\{\s*canonical: canonicalUrl/)
    expect(src).toMatch(/url: canonicalUrl/)
    expect(src).toMatch(/const appUrl = process\.env\.NEXT_PUBLIC_APP_URL \|\| 'https:\/\/liveportfolio\.site'/)
  })
})
