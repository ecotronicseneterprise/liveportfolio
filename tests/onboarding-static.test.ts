// Static guards for the onboarding rollout: Turnstile on EVERY password call, the flag, the removed callback route.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '..')
const SKIP = new Set(['node_modules', '.next', '.git', 'bench', 'tests', 'scripts', 'supabase', 'docs', 'public', 'messages'])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const files = walk(ROOT).map((f) => ({ rel: path.relative(ROOT, f).split(path.sep).join('/'), src: fs.readFileSync(f, 'utf8') }))

// Every call that Supabase's CAPTCHA protection applies to, as made through an auth client (`auth.signUp(`, `supabase.auth.signUp(` …).
const CALLS = /\bauth\s*\.\s*(signInWithPassword|signUp|resend|resetPasswordForEmail|signInWithOtp)\(/g
// The OLD wizard's signUp has no widget and is deliberately not touched. Enforce CAPTCHA in Supabase only after it is retired.
const NOT_WIRED: Record<string, string[]> = { 'app/create/page.tsx': ['signUp'] }

describe('Turnstile / captchaToken on every password sign-in, sign-up, reset and resend call', () => {
  it('each call site passes captchaOptions(...) or captchaToken (old wizard signUp excepted, on purpose)', () => {
    const missing: string[] = []
    let seen = 0
    for (const f of files) {
      if (!/auth\.|supabase/i.test(f.src)) continue
      for (const m of f.src.matchAll(CALLS)) {
        seen++
        const window = f.src.slice(m.index!, m.index! + 420)
        const ok = /captchaOptions\(|captchaToken/.test(window)
        if (!ok && !(NOT_WIRED[f.rel] ?? []).includes(m[1])) missing.push(`${f.rel}: ${m[1]}`)
      }
    }
    expect(seen).toBeGreaterThanOrEqual(8)
    expect(missing, 'add captchaOptions(token) to these calls (or the allow-list with a reason)').toEqual([])
  })

  it('the three places named in the brief are wired: login, dashboard re-auth, reset', () => {
    const login = files.find((f) => f.rel === 'app/login/page.tsx')!.src
    expect(login).toMatch(/signInWithPassword\(\{[^}]*captchaOptions\(captcha\)/)
    expect(login).toMatch(/resetPasswordForEmail\([\s\S]{0,200}captchaOptions\(captcha\)/)
    expect((login.match(/<Turnstile /g) ?? []).length).toBe(2)
    const dash = files.find((f) => f.rel === 'app/dashboard/page.tsx')!.src
    expect(dash).toMatch(/signInWithPassword\(\{[^}]*captchaOptions\(pwCaptcha\)/)
    expect(dash).toMatch(/<Turnstile onToken=\{setPwCaptcha\}/)
  })

  it('the widget renders nothing and loads no Cloudflare script without a site key', () => {
    const w = fs.readFileSync(path.join(ROOT, 'components/onboarding/Turnstile.tsx'), 'utf8')
    expect(w).toMatch(/if \(!siteKey\) return null/)
    expect(w).toMatch(/if \(!siteKey \|\| !box\.current\) return/)
  })
})

describe('rollout flag and leftovers', () => {
  it('the flag defaults to false in the example env and every new step page is gated', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.local.example'), 'utf8')
    expect(ex).toMatch(/^NEXT_PUBLIC_ONBOARDING_V2=false\s*$/m)
    expect(ex).toMatch(/^REQUIRE_AUTH_FOR_LLM=false\s*$/m)
    expect(ex).toMatch(/^NEXT_PUBLIC_TURNSTILE_SITE_KEY=\s*$/m)
    for (const step of ['account', 'verify', 'import', 'review', 'address', 'generate']) {
      const src = fs.readFileSync(path.join(ROOT, `app/create/${step}/page.tsx`), 'utf8')
      expect(src, step).toMatch(/if \(!onboardingEnabled\(\)\) notFound\(\)/)
    }
  })
  it('/auth/confirm is NOT gated (e-mail links must keep working)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/auth/confirm/page.tsx'), 'utf8')
    expect(src).not.toMatch(/onboardingEnabled/)
  })
  it('the old, broken PKCE callback route is gone and nothing links to it', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/auth/callback/route.ts'))).toBe(false)
    expect(files.filter((f) => f.src.includes('/auth/callback')).map((f) => f.rel)).toEqual([])
  })
  it('the old wizard is untouched by this work: it still signs up in the browser and has no onboarding imports', () => {
    const old = files.find((f) => f.rel === 'app/create/page.tsx')!.src
    expect(old).not.toMatch(/lib\/onboarding|components\/onboarding/)
  })
  it('new-flow modules never import the service role or write users/portfolios from the browser', () => {
    const client = files.filter((f) => f.rel.startsWith('components/onboarding/') || f.rel === 'lib/onboarding/use-flow.ts')
    for (const f of client) {
      expect(f.src, f.rel).not.toMatch(/getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/)
      expect(f.src, f.rel).not.toMatch(/\.from\(\s*['"](users|portfolios)['"]/)
    }
  })
  it('usage_events migration enables RLS, revokes the browser roles and adds no policy', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/manual/20261025110000_usage_events.sql'), 'utf8')
    expect(sql).toMatch(/alter table public\.usage_events enable row level security/i)
    expect(sql).toMatch(/revoke all on table public\.usage_events from anon, authenticated/i)
    expect(sql).not.toMatch(/create policy/i)
    expect(fs.readFileSync(path.join(ROOT, 'supabase/rollbacks/20261025110000_usage_events.rollback.sql'), 'utf8')).toMatch(/drop table if exists public\.usage_events/i)
  })
})
