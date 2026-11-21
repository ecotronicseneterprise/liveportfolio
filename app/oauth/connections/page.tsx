'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

// Connected apps: see which assistants are connected and disconnect any of them. Disconnecting takes effect on the next call.
type Conn = { id: string; client_name: string; allow_edits: boolean; share_contact: boolean; created_at: string; last_used_at: string | null }

export default function ConnectionsPage() {
  const [rows, setRows] = useState<Conn[] | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const { data } = await getSupabaseClient().auth.getSession()
    const t = data.session?.access_token
    if (!t) { window.location.href = `/login?next=${encodeURIComponent('/oauth/connections')}`; return }
    const res = await fetch('/api/mcp/connections', { headers: { authorization: `Bearer ${t}` } })
    const j = await res.json().catch(() => ({}))
    setRows(j.connections ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const revoke = async (c: Conn) => {
    const sb = getSupabaseClient()
    const t = (await sb.auth.getSession()).data.session?.access_token
    const res = await fetch(`/api/mcp/connections?id=${encodeURIComponent(c.id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setMessage('Could not disconnect right now.'); return }
    if (j.client_id) { try { await sb.auth.oauth.revokeGrant({ clientId: j.client_id }) } catch { /* the app is already blocked by our record */ } }
    setMessage(`${c.client_name || 'The app'} was disconnected.`)
    void load()
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
        <h1 className="mt-2 text-2xl font-semibold">Connected apps</h1>
        <p className="mt-2 text-neutral-600">AI assistants that can read and edit your portfolio. Disconnect any of them at any time.</p>
        {message && <p role="status" className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">{message}</p>}
        {rows === null && <p className="mt-6 text-neutral-600">Loading…</p>}
        {rows?.length === 0 && <p className="mt-6 text-neutral-600">No apps are connected.</p>}
        <ul className="mt-6 space-y-3">
          {rows?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.client_name || 'Assistant app'}</p>
                <p className="text-sm text-neutral-600">{c.allow_edits ? 'Can edit' : 'Read only'} · {c.share_contact ? 'sees contact details' : 'contact details hidden'}</p>
                <p className="text-xs text-neutral-500">{c.last_used_at ? `Last used ${new Date(c.last_used_at).toLocaleDateString()}` : 'Not used yet'}</p>
              </div>
              <button onClick={() => revoke(c)} className="min-h-[44px] shrink-0 rounded-full border border-neutral-300 px-4 text-sm font-medium">Disconnect</button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
