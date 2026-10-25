// Sends one cohort e-mail with the same bookkeeping as the other drips: a subscriber row per address, `subscribed = false` is respected,
// and `sent_flows` records each step once (key `d_<step>`), set only after the e-mail service accepted the message. Server only.
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendCohortEmail, type CohortCtx } from '@/lib/email-drip'
import { cohortKey, type CohortStep } from './schedule'

type Admin = ReturnType<typeof getSupabaseAdmin>
export type CohortSendResult = 'sent' | 'already_sent' | 'unsubscribed' | 'failed'

export async function sendCohortStep(
  admin: Admin,
  user: { id: string; email: string },
  step: CohortStep,
  ctx: Omit<CohortCtx, 'email'>,
): Promise<CohortSendResult> {
  // one row per address (ignored if it exists, so an unsubscribe is never undone)
  await admin
    .from('email_subscribers')
    .upsert({ email: user.email, user_id: user.id, subscribed: true, source: 'cohort' }, { onConflict: 'email', ignoreDuplicates: true })

  const { data } = await admin.from('email_subscribers').select('subscribed, sent_flows').eq('email', user.email).maybeSingle()
  const row = data as { subscribed?: boolean; sent_flows?: Record<string, boolean> | null } | null
  if (row?.subscribed === false) return 'unsubscribed'
  const flows = row?.sent_flows ?? {}
  const key = cohortKey(step)
  if (flows[key]) return 'already_sent'

  let ok = false
  try {
    ok = await sendCohortEmail(step, { ...ctx, email: user.email })
  } catch {
    ok = false
  }
  if (!ok) return 'failed' // not marked: the next run tries again

  await admin.from('email_subscribers').update({ sent_flows: { ...flows, [key]: true } }).eq('email', user.email)
  return 'sent'
}
