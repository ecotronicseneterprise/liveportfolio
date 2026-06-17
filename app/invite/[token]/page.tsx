import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import Logo from '@/components/Logo'

interface Props {
  params: Promise<{ token: string }>
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="mb-8">
          <a href="/"><Logo /></a>
        </div>
        <p className="text-gray-700 font-medium mb-2">{message}</p>
        <p className="text-gray-400 text-sm mb-6">
          You can still build a free portfolio — no invite needed.
        </p>
        <a
          href="/create"
          className="inline-block px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
        >
          Build your portfolio free →
        </a>
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabaseAdmin = getSupabaseAdmin()

  const { data: invite } = await supabaseAdmin
    .from('invite_tokens')
    .select('partner_key, free_pro, used, expires_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return <ErrorCard message="This invite link is not valid." />
  }
  if (invite.used) {
    return <ErrorCard message="This invite has already been used." />
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorCard message="This invite has expired." />
  }

  // Valid — redirect to create with affiliate + invite params
  const dest = `/create?ref=${encodeURIComponent(invite.partner_key)}&invite=${encodeURIComponent(token)}${invite.free_pro ? '&free=true' : ''}`
  redirect(dest)
}
