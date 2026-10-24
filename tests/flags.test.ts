import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const KEYS = ['NEXT_PUBLIC_ONBOARDING_V2', 'NEXT_PUBLIC_IMPORT_ENABLED', 'IMPORT_ENABLED', 'REQUIRE_AUTH_FOR_LLM', 'NEXT_PUBLIC_SOCIAL_PROVIDERS', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'PAYSTACK_PRICE_CHECK', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_REF', 'VERCEL_ENV']
async function call(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const k of KEYS) delete process.env[k]
  Object.assign(process.env, env)
  const { GET } = await import('../app/api/flags/route')
  const res = await GET()
  return { res, json: await res.json() }
}
afterEach(() => { for (const k of KEYS) delete process.env[k] })

describe('GET /api/flags', () => {
  it('everything off by default', async () => {
    const { json, res } = await call()
    expect(json.flags).toEqual({ onboardingV2: false, importUi: false, importApi: false, requireAuthForLlm: false, social: false, turnstile: false, priceCheckEnforced: false })
    expect(json.commit).toBeNull()
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('reports what is on and the short commit', async () => {
    const { json } = await call({ NEXT_PUBLIC_ONBOARDING_V2: 'true', NEXT_PUBLIC_IMPORT_ENABLED: 'true', IMPORT_ENABLED: 'true', NEXT_PUBLIC_SOCIAL_PROVIDERS: 'google', VERCEL_GIT_COMMIT_SHA: 'a0fac3a1234567890', VERCEL_GIT_COMMIT_REF: 'dev', VERCEL_ENV: 'preview' })
    expect(json.flags).toMatchObject({ onboardingV2: true, importUi: true, importApi: true, social: true })
    expect(json.commit).toBe('a0fac3a')
    expect(json.branch).toBe('dev')
    expect(json.env).toBe('preview')
  })
  it('only the exact value "true" counts (a quoted or padded value is a typo, and shows as off)', async () => {
    for (const bad of ['"true"', ' true', 'TRUE', '1', 'yes']) {
      expect((await call({ NEXT_PUBLIC_ONBOARDING_V2: bad })).json.flags.onboardingV2, bad).toBe(false)
    }
  })
  it('exposes booleans and a short commit only: never a secret or a value', async () => {
    const secrets = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA-secret-looking', NEXT_PUBLIC_SOCIAL_PROVIDERS: 'google,github', PAYSTACK_PRICE_CHECK: 'enforce' }
    const { json } = await call(secrets)
    const text = JSON.stringify(json)
    expect(text).not.toContain('0x4AAAA')
    expect(text).not.toContain('github')
    for (const v of Object.values(json.flags)) expect(typeof v).toBe('boolean')
    expect(json.flags.turnstile).toBe(true)
    expect(json.flags.priceCheckEnforced).toBe(true)
  })
  it('the route reads no secret variable', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/api/flags/route.ts'), 'utf8')
    expect(src).not.toMatch(/SERVICE_ROLE|SECRET|API_KEY|PAYSTACK_SECRET|CRON_SECRET|TOKEN/)
  })
})
