import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { proContent } from './fixtures/pro-content'

const state = vi.hoisted(() => ({ row: null as Record<string, unknown> | null }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ from: () => {
  const query = { select: () => query, eq: () => query, neq: () => query, single: async () => ({ data: state.row, error: null }) }
  return query
} }) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))
vi.mock('@/lib/ipinfo', () => ({ getIpInfo: vi.fn() }))
vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import PortfolioPage from '../app/portfolio/[slug]/page'

beforeEach(() => { state.row = null })
const render = async (plan: string, designs?: unknown) => {
  state.row = { plan, slug: 'synthetic', portfolios: { id: 'synthetic', template: 'developer', content: { ...proContent, pro_designs: designs } } }
  return renderToStaticMarkup(await PortfolioPage({ params: Promise.resolve({ slug: 'synthetic' }) }))
}
it('the public page honors explicit Pro opt-in', async () => {
  const html = await render('pro', { developer: 2 })
  expect(html).toContain('data-pro-template="developer"')
  expect(html).toContain('About evidence marker')
})
it('the public page keeps legacy rendering without a valid marker', async () => {
  for (const marker of [undefined, { developer: 99 }, { finance: 2 }]) expect(await render('pro', marker)).not.toContain('data-design-version="2"')
})
it('a Basic account cannot activate a stored Pro redesign through public rendering', async () => {
  expect(await render('basic', { developer: 2 })).not.toContain('data-pro-template')
})
it('a missing/unpublished result still returns not-found', async () => {
  await expect(PortfolioPage({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND')
})