import { getSupabaseAdmin } from '@/lib/supabase'

export async function getUserPlan(userId: string): Promise<'free' | 'basic' | 'pro'> {
  const supabaseAdmin = getSupabaseAdmin()

  // 1. Active subscription takes priority
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (sub?.plan === 'basic' || sub?.plan === 'pro') {
    return sub.plan
  }

  // 2. Legacy one-time paid users (users.plan set before subscriptions table existed)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single()

  if (user?.plan && user.plan !== 'unpublished') {
    return 'pro'
  }

  return 'free'
}
