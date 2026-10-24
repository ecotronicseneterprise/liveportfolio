'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { browserStorage, createDraftStore, draftStatusOf, type Draft } from './draft'
import { resolveState, routeFor, STEP_ALLOWS, STEP_PATHS, type AccountState, type ServerState } from './state'
import type { AuthLike } from './auth-actions'
import { providerProfile } from './social'

type Step = keyof typeof STEP_PATHS

export function getAuth(): AuthLike {
  return getSupabaseClient().auth as unknown as AuthLike
}

/**
 * Loads the session, asks the server where this person belongs, and redirects away from a step they should not be on
 * (this is the "signed in but no users row" handling, in one place). The draft store is cleared on SIGNED_OUT.
 */
export function useFlow(step: Step | null) {
  const router = useRouter()
  const store = useMemo(() => createDraftStore(browserStorage()), [])
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<AccountState>('no_session')
  const [server, setServer] = useState<ServerState | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  // from the provider (social sign-in only): validated, prefill-only, see lib/onboarding/social.ts
  const [provider, setProvider] = useState({ social: false, name: '', githubLogin: '' })
  const alive = useRef(true)

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data } = await getSupabaseClient().auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const load = useCallback(async () => {
    const sb = getSupabaseClient()
    const { data } = await sb.auth.getSession()
    const session = data.session
    let srv: ServerState | null = null
    let verified = false
    if (session) {
      try {
        const res = await fetch('/api/account/state', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
        if (res.ok) {
          const j = await res.json()
          srv = { profile: !!j.profile, slug: j.slug ?? null, published: !!j.published, portfolioId: j.portfolioId ?? null }
          verified = !!j.emailVerified
        } else {
          // token rejected: treat as signed out so the person is not stuck
          if (res.status === 401) await sb.auth.signOut()
        }
      } catch {
        // offline: fall through with what the session says
        verified = !!session.user?.email_confirmed_at
      }
    }
    const next = resolveState(session ? { emailVerified: verified } : null, srv)
    const d = store.load()
    if (!alive.current) return null
    setServer(srv)
    setEmail(session?.user?.email ?? null)
    const prov = providerProfile(session?.user as never)
    setProvider(prov)
    setDraft(d)
    setState(next)
    setLoading(false)
    return { next, srv, d, social: prov.social }
  }, [store])

  useEffect(() => {
    alive.current = true
    const sb = getSupabaseClient()
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') store.clear()
    })
    void load().then((r) => {
      if (!r || !step) return
      if (!STEP_ALLOWS[step].includes(r.next)) router.replace(routeFor(r.next, draftStatusOf(r.d), r.srv, { social: r.social }))
    })
    return () => {
      alive.current = false
      sub.subscription.unsubscribe()
    }
  }, [load, router, step, store])

  /** Recompute and go to the right place (after sign-in, verification, import, review, address…). */
  const goNext = useCallback(async () => {
    const r = await load()
    if (r) router.replace(routeFor(r.next, draftStatusOf(r.d), r.srv, { social: r.social }))
  }, [load, router])

  const saveDraft = useCallback((d: Draft) => { store.save(d); setDraft(d) }, [store])

  return { loading, state, server, email, draft, provider, store, getToken, goNext, saveDraft, refresh: load }
}
