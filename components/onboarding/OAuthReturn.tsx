'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { decideOAuthReturn } from '@/lib/onboarding/social'
import { t } from '@/lib/onboarding/t'

/**
 * /auth/return — where the provider sends the browser back. supabase-js (implicit flow, this app's session model)
 * reads the session from the URL itself; this page only waits for it, then follows an allow-listed ?next=.
 * After a social sign-in there is no users row yet, so /create/account routes onward via getAccountState.
 */
export default function OAuthReturn() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const providerError = !!(q.get('error') || q.get('error_description') || h.get('error') || h.get('error_description'))
    const next = q.get('next')
    const sb = getSupabaseClient()
    let done = false
    const finish = (hasSession: boolean, timedOut = false) => {
      if (done) return
      const d = decideOAuthReturn({ hasSession, providerError, timedOut, next })
      if (d.kind === 'go') { done = true; router.replace(d.to) }
      else if (d.kind === 'error') { done = true; setFailed(true) }
    }
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' && session) finish(true) })
    void sb.auth.getSession().then(({ data }) => finish(!!data.session))
    const timer = setTimeout(() => finish(false, true), 8000)
    return () => { done = true; clearTimeout(timer); sub.subscription.unsubscribe() }
  }, [router])

  return (
    <main className="max-w-md mx-auto p-6">
      {failed ? (
        <>
          <p role="alert" className="mb-3">{t('social.failed')}</p>
          <a className="underline min-h-11 inline-block" href="/create/account">{t('confirm.back')}</a>
        </>
      ) : (
        <p role="status">{t('social.finishing')}</p>
      )}
    </main>
  )
}
