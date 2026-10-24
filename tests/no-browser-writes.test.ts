// Regression guard for the RLS hotfix: the browser must never write `users` / `portfolios`, and the service-role
// client must never reach the browser bundle. Static scan of the source tree.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { safeJsonLd } from '../lib/json-ld'

const ROOT = path.resolve(__dirname, '..')
const SKIP = new Set(['node_modules', '.next', '.git', 'bench', 'reactive-resume', 'tests', 'scripts', 'supabase', 'docs', 'public'])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const files = walk(ROOT).map((f) => ({ rel: path.relative(ROOT, f).split(path.sep).join('/'), src: fs.readFileSync(f, 'utf8') }))
const isClient = (src: string) => /^\s*(['"])use client\1/m.test(src.split('\n').slice(0, 5).join('\n'))

const WRITE_AFTER_FROM = /\.from\(\s*['"](users|portfolios)['"]\s*\)\s*\.(insert|update|upsert|delete)\(/

describe('browser cannot write users/portfolios', () => {
  it('no "use client" file writes users or portfolios', () => {
    const offenders = files.filter((f) => isClient(f.src) && WRITE_AFTER_FROM.test(f.src.replace(/\s+/g, ' ')))
    expect(offenders.map((f) => f.rel)).toEqual([])
  })

  it('no "use client" file imports the service-role client or reads SUPABASE_SERVICE_ROLE_KEY', () => {
    const offenders = files.filter((f) => isClient(f.src) && /getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/.test(f.src))
    expect(offenders.map((f) => f.rel)).toEqual([])
  })

  it('the service-role key is never exposed through a NEXT_PUBLIC_ variable', () => {
    const offenders = files.filter((f) => /NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET)/.test(f.src))
    expect(offenders.map((f) => f.rel)).toEqual([])
    const envExample = fs.readFileSync(path.join(ROOT, '.env.local.example'), 'utf8')
    expect(envExample).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET)/)
  })

  it('every server-side write to users/portfolios is in this allow-list (all use the service role)', () => {
    const ALLOWED = new Set([
      'app/api/account/profile/route.ts', // signup row (new)
      'app/api/account/slug/route.ts', // address change while never published
      'app/api/admin/invite/consume/route.ts', // free-Pro invite
      'app/api/bootcamp/redeem/route.ts', // bootcamp code
      'app/api/cron/expire-plans/route.ts', // plan expiry
      'app/api/delete-account/route.ts',
      'app/api/generate/route.ts', // portfolios insert
      'app/api/paystack-webhook/route.ts', // plan activation
      'lib/portfolio/commit.ts', // portfolios update: the one write path for edits and restores (/api/update, /api/revisions)
    ])
    const writers = files
      .filter((f) => /\.from\(\s*['"](users|portfolios)['"]\s*\)/.test(f.src) && /\.(insert|update|upsert|delete)\(/.test(f.src))
      .map((f) => f.rel)
      .filter((rel) => {
        const src = files.find((f) => f.rel === rel)!.src.replace(/\s+/g, ' ')
        return WRITE_AFTER_FROM.test(src)
      })
    const unexpected = writers.filter((w) => !ALLOWED.has(w))
    expect(unexpected, 'new writer of users/portfolios: add it to the allow-list only if it uses the service role').toEqual([])
    for (const w of writers) {
      const src = files.find((f) => f.rel === w)!.src
      expect(/getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/.test(src), `${w} must use the service role`).toBe(true)
      expect(isClient(src), `${w} must not be a client file`).toBe(false)
    }
  })
})

describe('JSON-LD escaping (stored XSS on public portfolios)', () => {
  const payload = '</script><script>alert(document.domain)</script>'

  it('the portfolio page serialises JSON-LD with safeJsonLd, not JSON.stringify', () => {
    const page = fs.readFileSync(path.join(ROOT, 'app/portfolio/[slug]/page.tsx'), 'utf8')
    expect(page).toContain('safeJsonLd(personSchema)')
    expect(page).not.toMatch(/__html:\s*JSON\.stringify\(personSchema\)/)
  })

  it('neutralises tag breakouts in every field and round-trips the data', () => {
    const data = { name: payload, jobTitle: 'a<b>c', description: 'x&y', email: 'a@b.co', 'a-b': '  ' }
    const out = safeJsonLd(data)
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).not.toContain('</script')
    expect(JSON.parse(out)).toEqual(data)
  })

  it('output is safe inside a script element (single element, no comment opener)', () => {
    const html = `<script type="application/ld+json">${safeJsonLd({ n: '<!-- <script>' })}</script>`
    expect((html.match(/<script/g) ?? []).length).toBe(1)
    expect(html).not.toContain('<!--')
  })
})
