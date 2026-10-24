import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectImageUrl } from '../lib/connectors/safe-url'
import { sanitizeDraft } from '../lib/onboarding/draft'
import { draftToGeneratePayload } from '../lib/onboarding/generate'
import { draftToPreviewContent } from '../lib/onboarding/preview-content'
import { checkImageFile } from '../lib/onboarding/image'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')

const SUPA = 'https://abcd1234.supabase.co'
const GOOD = `${SUPA}/storage/v1/object/public/project-images/u1-0.jpg`

describe('projectImageUrl (only this project\'s public project-images bucket is accepted)', () => {
  it('accepts the URL the upload route returns, with or without a version query', () => {
    expect(projectImageUrl(GOOD, SUPA)).toBe(GOOD)
    expect(projectImageUrl(`${GOOD}?v=1730000000000`, SUPA)).toBe(`${GOOD}?v=1730000000000`)
  })
  it.each([
    ['another host', 'https://evil.example/storage/v1/object/public/project-images/u1-0.jpg'],
    ['look-alike suffix', `${SUPA}.evil.example/storage/v1/object/public/project-images/u1-0.jpg`],
    ['look-alike userinfo', `https://abcd1234.supabase.co@evil.example/storage/v1/object/public/project-images/u1-0.jpg`],
    ['credentials', `https://u:p@abcd1234.supabase.co/storage/v1/object/public/project-images/u1-0.jpg`],
    ['http', `http://abcd1234.supabase.co/storage/v1/object/public/project-images/u1-0.jpg`],
    ['another bucket', `${SUPA}/storage/v1/object/public/avatars/u1.jpg`],
    ['private object path', `${SUPA}/storage/v1/object/sign/project-images/u1-0.jpg`],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:image/png;base64,AAAA'],
    ['relative', '/storage/v1/object/public/project-images/u1-0.jpg'],
    ['over 500 characters', `${GOOD}?${'a'.repeat(500)}`],
  ])('rejects %s', (_n, v) => expect(projectImageUrl(v, SUPA)).toBe(''))
  it.each([null, undefined, 5, {}, []])('rejects non-strings (%j)', (v) => expect(projectImageUrl(v, SUPA)).toBe(''))
  it('follows the configured scheme: a local http Supabase accepts http, a production https one never accepts http', () => {
    const local = 'http://localhost:54321'
    expect(projectImageUrl(`${local}/storage/v1/object/public/project-images/u-0.jpg`, local)).toBe(`${local}/storage/v1/object/public/project-images/u-0.jpg`)
    expect(projectImageUrl(`${local}/storage/v1/object/public/project-images/u-0.jpg`, SUPA)).toBe('')
    expect(projectImageUrl(GOOD, local)).toBe('')
  })
  it('rejects everything when the Supabase URL is not configured', () => expect(projectImageUrl(GOOD, undefined)).toBe(''))
})

describe('image_url travels through the flow', () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA })
  afterEach(() => { delete process.env.NEXT_PUBLIC_SUPABASE_URL })
  const draft = (image_url: unknown) => sanitizeDraft({ name: 'Ada', role: 'Engineer', projects: [{ title: 'P', description: 'd', stack: 'go', url: '', image_url }] })!

  it('the stored draft keeps a valid image and drops anything else', () => {
    expect(draft(GOOD).projects[0].image_url).toBe(GOOD)
    expect(draft('https://evil.example/x.jpg').projects[0]).not.toHaveProperty('image_url')
    expect(draft(42).projects[0]).not.toHaveProperty('image_url')
    expect(draft(undefined).projects[0]).not.toHaveProperty('image_url')
  })
  it('the generate payload carries it (and /api/generate already stores projects[].image_url)', () => {
    const p = draftToGeneratePayload(draft(GOOD), 'a@b.co')
    expect(p.projects[0].image_url).toBe(GOOD)
    expect(draftToGeneratePayload(draft(undefined), 'a@b.co').projects[0].image_url).toBeUndefined()
  })
  it('the live preview shows it', () => {
    expect(draftToPreviewContent(draft(GOOD), 'a@b.co').projects[0].image_url).toBe(GOOD)
  })
})

describe('checkImageFile', () => {
  it.each([['image/jpeg', 1000, 'ok'], ['image/png', 1000, 'ok'], ['image/webp', 1000, 'ok'], ['image/gif', 1000, 'type'], ['application/pdf', 1000, 'type'], ['image/svg+xml', 1000, 'type'], ['', 1000, 'type'], ['image/jpeg', 10 * 1024 * 1024 + 1, 'size']])(
    '%s %i bytes → %s', (type, size, out) => expect(checkImageFile({ type, size })).toBe(out),
  )
})

describe('upload route limits', () => {
  it('caps the size and only accepts a 1-2 digit index (it goes into a storage path)', () => {
    const src = read('app/api/upload-project-image/route.ts')
    expect(src).toMatch(/file\.size > 5 \* 1024 \* 1024/)
    expect(src).toMatch(/\/\^\\d\{1,2\}\$\/\.test\(idx\)/)
  })
})

describe('sign-in entry point and where a finished account lands', () => {
  it('SIGNIN_HREF is the Sign in tab with the flow on, /login with it off', async () => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_ONBOARDING_V2 = 'true'
    expect((await import('../lib/onboarding/entry')).SIGNIN_HREF).toBe('/create/account?mode=signin')
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_ONBOARDING_V2
    expect((await import('../lib/onboarding/entry')).SIGNIN_HREF).toBe('/login')
  })
  it('a signed-out visitor to the dashboard or the preview is sent to sign in, not to "make my portfolio"', () => {
    expect(read('app/dashboard/page.tsx')).toMatch(/if \(!session\) \{ router\.push\(SIGNIN_HREF\); return \}/)
    expect(read('app/preview/[portfolioId]/page.tsx')).toMatch(/router\.push\(SIGNIN_HREF\)/)
  })
  it('the account step opens the Sign in tab for ?mode=signin', () => {
    expect(read('components/onboarding/AccountStep.tsx')).toMatch(/get\('mode'\) === 'signin'\) setMode\('signin'\)/)
  })
  it('generate ends on the dashboard (an invited account keeps the preview banner), and the preview links back', () => {
    expect(read('components/onboarding/GenerateStep.tsx')).toMatch(/router\.replace\(invited \? `\/preview\/\$\{result\.portfolioId\}\?invited=true` : '\/dashboard'\)/)
    expect(read('app/preview/[portfolioId]/page.tsx')).toMatch(/href="\/dashboard"[^>]*>← Dashboard</)
  })
})

describe('rules of hooks in the review step', () => {
  it('no hook is called after the early return (a conditional hook crashes the page with "Rendered more hooks")', () => {
    const src = read('components/onboarding/ReviewStep.tsx')
    const at = src.indexOf('if (flow.loading || !d) return')
    expect(at, 'early return not found').toBeGreaterThan(0)
    const after = src.slice(at)
    expect(after.match(/\buse(State|Ref|Effect|Memo|Callback|Debounced|Flow|Router)\(/g) ?? []).toEqual([])
  })
})
