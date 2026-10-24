// Payment intents: one row per checkout we started, written by the server before Paystack is called. The webhook and the return page
// trust ONLY references found here, with the amount and tier we stored. Server only.
import crypto from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Retryable } from './grant'
import type { Tier } from './prices'

export type IntentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'cancelled'
export interface Intent {
  id: string
  user_id: string
  tier: Tier
  amount_kobo: number
  currency: string
  reference: string
  status: IntentStatus
  granted_expires_at?: string | null
}

export const INTENT_COLUMNS = 'id, user_id, tier, amount_kobo, currency, reference, status, granted_expires_at'
export const INTENT_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_INTENTS_PER_HOUR = 10

/** Our own reference, never taken from the client. 18 random bytes is 24 URL-safe characters. */
export const newReference = (): string => `lpi_${crypto.randomBytes(18).toString('base64url')}`

/** True when the error means the table is not there yet (the migration has not been run). */
export function isMissingTable(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message ?? '')
}

export type IntentLookup = { kind: 'found'; intent: Intent } | { kind: 'none' } | { kind: 'unavailable' }

/** Looks a reference up. A missing table is "unavailable" (callers fall back to the old path); any other database error throws Retryable. */
export async function findIntent(reference: string, userId?: string): Promise<IntentLookup> {
  const admin = getSupabaseAdmin()
  let q = admin.from('payment_intents').select(INTENT_COLUMNS).eq('reference', reference)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.maybeSingle()
  if (error) {
    if (isMissingTable(error)) return { kind: 'unavailable' }
    throw new Retryable(`intent lookup: ${error.message}`)
  }
  return data ? { kind: 'found', intent: data as Intent } : { kind: 'none' }
}

export async function markIntent(id: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await getSupabaseAdmin().from('payment_intents').update(patch).eq('id', id)
  } catch {
    // bookkeeping only: the payment row and the subscription are the record of truth
  }
}
