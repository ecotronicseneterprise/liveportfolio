'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

// The sign-in step for an AI assistant app (ChatGPT, Claude...). Supabase sends the person here with ?authorization_id=.
// We show who is asking, let them choose what it may do, record the connection on OUR side (Supabase has no custom scopes), then approve.
type Details = { authorization_id: string; redirect_uri: string; client: { id?: string; client_id?: string; name?: string }; user: { email: string } }

export default function ConsentPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'working'>('loading')
  const [message, setMessage] = useState('')
  const [d, setD] = useState<Details | null>(null)
  const [edits, setEdits] = useState(true)
  const [contact, setContact] = useState(false)
  const [id, setId] = useState('')

  useEffect(() => {
    const aid = new URLSearchParams(window.location.search).get('authorization_id') ?? ''
    setId(aid)
    ;(async () => {
      const sb = getSupabaseClient()
      const { data: s } = await sb.auth.getSession()
      if (!s.session) {
        window.location.href = `/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${aid}`)}`
        return
      }
      if (!aid) { setMessage('This page is opened by an assistant app. Start from the app.'); setState('error'); return }
      const { data, error } = await sb.auth.oauth.getAuthorizationDetails(aid)
      if (error || !data) { setMessage('This sign-in request is no longer valid. Start again from the app.'); setState('error'); return }
      if (!('authorization_id' in data)) { window.location.href = data.redirect_url; return }
      setD(data as unknown as Details)
      setState('ready')
    })()
  }, [])

  const decide = async (approve: boolean) => {
    if (!d) return
    setState('working')
    const sb = getSupabaseClient()
    if (approve) {
      const { data: s } = await sb.auth.getSession()
      const res = await fetch('/api/mcp/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${s.session?.access_token}` },
        body: JSON.stringify({ client_id: d.client.id ?? d.client.client_id, client_name: d.client.name ?? '', allow_edits: edits, share_contact: contact }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMessage(j.message || 'Could not connect this app right now.')
        setState('error')
        return
      }
    }
    const r = approve ? await sb.auth.oauth.approveAuthorization(id) : await sb.auth.oauth.denyAuthorization(id)
    if (r.error || !r.data) { setMessage('Something went wrong. Start again from the app.'); setState('error'); return }
    window.location.href = r.data.redirect_url
  }

  let host = ''
  try { host = d ? new URL(d.redirect_uri).host : '' } catch { /* shown blank */ }

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
        {state === 'loading' && <p className="mt-6 text-neutral-600">Loading…</p>}
        {state === 'error' && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{message}</p>}
        {(state === 'ready' || state === 'working') && d && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Connect {d.client.name || 'this app'} to your portfolio?</h1>
            <p className="mt-3 text-neutral-600">
              {d.client.name || 'This app'} ({host}) is asking to read and edit the portfolio on <strong>{d.user.email}</strong>. Your portfolio text will be sent to that app.
            </p>
            <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 p-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={edits} onChange={(e) => setEdits(e.target.checked)} />
                <span><strong>Allow edits</strong><br /><span className="text-sm text-neutral-600">Every edit is saved as a version you can undo. Removing things needs your approval here.</span></span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={contact} onChange={(e) => setContact(e.target.checked)} />
                <span><strong>Share my email, phone and WhatsApp</strong><br /><span className="text-sm text-neutral-600">Off by default. Leave off unless you want the assistant to read them.</span></span>
              </label>
            </div>
            <p className="mt-4 text-sm text-neutral-600">It can never publish, change your address, touch billing or delete anything. You can disconnect it any time at <a className="underline" href="/oauth/connections">Connected apps</a>.</p>
            <div className="mt-6 flex gap-3">
              <button disabled={state === 'working'} onClick={() => decide(true)} className="min-h-[48px] flex-1 rounded-full bg-neutral-900 px-5 font-medium text-white disabled:opacity-50">Connect</button>
              <button disabled={state === 'working'} onClick={() => decide(false)} className="min-h-[48px] flex-1 rounded-full border border-neutral-300 px-5 font-medium disabled:opacity-50">Cancel</button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
