import type { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export interface AuthedUser {
  id: string
  email: string | null
  emailVerified: boolean
}

/** Verifies the Bearer token with Supabase. Returns null for a missing/invalid token. Never trusts cookies. */
export async function getUserFromRequest(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const { data, error } = await getSupabaseClient().auth.getUser(token)
    const u = data?.user
    if (error || !u) return null
    return { id: u.id, email: u.email ?? null, emailVerified: !!u.email_confirmed_at }
  } catch {
    return null
  }
}
