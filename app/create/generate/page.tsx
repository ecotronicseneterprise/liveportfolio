import { notFound } from 'next/navigation'
import { onboardingEnabled } from '@/lib/onboarding/flag'
import GenerateStep from '@/components/onboarding/GenerateStep'

export const dynamic = 'force-dynamic'

// New onboarding flow (NEXT_PUBLIC_ONBOARDING_V2=true). Dark by default: the old /create wizard stays the only path.
export default function Page() {
  if (!onboardingEnabled()) notFound()
  return <GenerateStep />
}
