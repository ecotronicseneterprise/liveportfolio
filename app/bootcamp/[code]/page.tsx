import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = getSupabaseAdmin()
  const { data: bootcamp } = await supabase
    .from('bootcamp_codes')
    .select('name')
    .eq('code', code)
    .single()

  if (!bootcamp) {
    return { title: 'Invalid Link | LivePortfolio' }
  }

  return {
    title: `${bootcamp.name} × LivePortfolio — Free Portfolio for Students`,
    description: `${bootcamp.name} students get 6 months of free access to LivePortfolio. Build your portfolio in minutes.`,
    robots: { index: false, follow: false },
  }
}

export default async function BootcampLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = getSupabaseAdmin()

  const { data: bootcamp } = await supabase
    .from('bootcamp_codes')
    .select('code, name, plan_to_grant, active, max_uses, use_count')
    .eq('code', code)
    .single()

  if (!bootcamp || !bootcamp.active) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">This link is no longer active</h1>
          <p className="text-gray-500 text-sm">
            Please contact your bootcamp for an updated link, or{' '}
            <a href="/create" className="text-[#0A66C2] hover:underline">start for free</a> directly.
          </p>
        </div>
      </div>
    )
  }

  // Redirect immediately — server-side is cleaner than a JS countdown
  redirect(`/create?bootcamp=${bootcamp.code}&name=${encodeURIComponent(bootcamp.name)}`)
}
