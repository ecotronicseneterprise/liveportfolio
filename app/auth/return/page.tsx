import OAuthReturn from '@/components/onboarding/OAuthReturn'

export const dynamic = 'force-dynamic'

// Social sign-in return target. Not behind the onboarding flag; nothing links here unless a provider is enabled.
export default function Page() {
  return <OAuthReturn />
}
