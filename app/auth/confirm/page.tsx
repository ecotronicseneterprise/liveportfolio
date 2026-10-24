import ConfirmEmail from '@/components/onboarding/ConfirmEmail'

export const dynamic = 'force-dynamic'

// E-mail link target (sign-up confirmation, password recovery, e-mail change). Not behind the onboarding flag.
export default function Page() {
  return <ConfirmEmail />
}
