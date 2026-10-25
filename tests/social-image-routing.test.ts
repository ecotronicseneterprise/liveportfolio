import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

async function route(host: string, path: string) {
  const { middleware } = await import('../middleware')
  return middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }))
}

describe('social preview image routing', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'liveportfolio.site')
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ['liveportfolio.site', '/opengraph-image'],
    ['liveportfolio.site', '/opengraph-image?c085b885c2d420db'],
    ['liveportfolio.site', '/opengraph-image/'],
    ['www.liveportfolio.site', '/opengraph-image?version=2'],
  ])('lets Next serve the image on %s%s instead of looking up a portfolio', async (host, path) => {
    const response = await route(host, path)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('still rewrites ordinary portfolio short links', async () => {
    const response = await route('liveportfolio.site', '/ada')
    expect(new URL(response.headers.get('x-middleware-rewrite')!).pathname).toBe('/portfolio/ada')
  })

  it('does not exempt similarly named portfolio slugs', async () => {
    const response = await route('liveportfolio.site', '/opengraph-image-designer')
    expect(new URL(response.headers.get('x-middleware-rewrite')!).pathname).toBe('/portfolio/opengraph-image-designer')
  })

  it('preserves portfolio subdomain routing', async () => {
    const response = await route('ada.liveportfolio.site', '/')
    expect(new URL(response.headers.get('x-middleware-rewrite')!).pathname).toBe('/portfolio/ada')
  })
})