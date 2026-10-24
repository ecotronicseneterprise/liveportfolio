import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/flags — which feature flags THIS deployment was built/run with, and which commit it is. Booleans and a short
// commit id only: no secrets, no values. It exists so "is the code missing or is the flag off?" is one request:
//   onboardingV2 false  → the build predates the env var (NEXT_PUBLIC_* values are baked in at build time: redeploy)
//   commit differs      → the code is not the commit you think it is
// NEXT_PUBLIC_* are compiled in; the others are read when the request runs.
export async function GET() {
  const body = {
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    env: process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
    flags: {
      onboardingV2: process.env.NEXT_PUBLIC_ONBOARDING_V2 === 'true', // compiled
      importUi: process.env.NEXT_PUBLIC_IMPORT_ENABLED === 'true', // compiled: shows the GitHub and Paste blocks
      importApi: process.env.IMPORT_ENABLED === 'true', // runtime: /api/import answers
      requireAuthForLlm: process.env.REQUIRE_AUTH_FOR_LLM === 'true',
      social: !!(process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS || '').trim(), // compiled
      turnstile: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, // compiled
      priceCheckEnforced: process.env.PAYSTACK_PRICE_CHECK === 'enforce',
    },
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
