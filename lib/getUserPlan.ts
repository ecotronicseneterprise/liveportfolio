import { getSupabaseAdmin } from '@/lib/supabase'

/** users.plan → plan. 'unpublished'/empty = free, 'basic' = basic, 'pro' and legacy paid values = pro. */
export function planFromUserColumn(v: unknown): 'free' | 'basic' | 'pro' {
  if (typeof v !== 'string' || !v || v === 'unpublished') return 'free'
  if (v === 'basic') return 'basic'
  return 'pro'
}

export async function getUserPlan(userId: string): Promise<'free' | 'basic' | 'pro'> {
  const supabaseAdmin = getSupabaseAdmin()

  // 1. Active subscription takes priority
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled']) // cancelled keeps access until expires_at
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (sub?.plan === 'basic' || sub?.plan === 'pro') {
    return sub.plan
  }

  // 2. users.plan: the cache the webhook keeps in sync, and the only source for legacy one-time payers, invites and
  //    bootcamp grants. It is mapped by NAME: a lapsed Basic subscriber (users.plan still "basic" until the expiry cron
  //    runs, up to the 3-day grace) is Basic, never Pro. Any other non-empty legacy value keeps its old meaning (Pro).
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single()

  return planFromUserColumn(user?.plan)
}
