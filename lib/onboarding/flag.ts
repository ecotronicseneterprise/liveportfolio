// The new onboarding flow (/create/account … /create/generate) ships dark. NEXT_PUBLIC_ONBOARDING_V2 is baked in at
// build time; the pages call notFound() when it is not exactly "true", so the old /create wizard stays the only path.
// /auth/confirm is NOT gated: Supabase e-mail links must keep working whatever the flag says.
export function onboardingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_V2 === 'true'
}
