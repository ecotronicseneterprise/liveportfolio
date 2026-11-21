'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

// Where the person approves a change their assistant proposed (removing things, replacing a whole list, batches, restoring).
// The assistant gets only the link; it cannot press the button.
export default function ApprovePage() {
  const [state, setState] = useState<'loading' | 'ready' | 'working' | 'done' | 'error'>('loading')
  const [summary, setSummary] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [id, setId] = useState('')

  const token = async () => (await getSupabaseClient().auth.getSession()).data.session?.access_token

  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('id') ?? ''
    setId(pid)
    ;(async () => {
      const t = await token()
      if (!t) { window.location.href = `/login?next=${encodeURIComponent(`/oauth/approve?id=${pid}`)}`; return }
      const res = await fetch(`/api/mcp/proposals?id=${encodeURIComponent(pid)}`, { headers: { authorization: `Bearer ${t}` } })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMessage('This request was not found on your account.'); setState('error'); return }
      if (j.status !== 'pending') { setMessage(j.status === 'applied' ? 'This change was already applied.' : j.status === 'rejected' ? 'This change was declined.' : 'This request expired. Ask your assistant to make it again.'); setState('error'); return }
      setSummary(j.summary ?? [])
      setState('ready')
    })()
  }, [])

  const decide = async (decision: 'approve' | 'reject') => {
    setState('working')
    const res = await fetch('/api/mcp/proposals', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id, decision }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setMessage(j.message || 'That did not work.'); setState('error'); return }
    setMessage(decision === 'approve' ? 'Done. The change is saved. You can undo it from History in your dashboard.' : 'Declined. Nothing was changed.')
    setState('done')
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
        {state === 'loading' && <p className="mt-6 text-neutral-600">Loading…</p>}
        {state === 'error' && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{message}</p>}
        {state === 'done' && <p className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">{message}</p>}
        {(state === 'ready' || state === 'working') && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Approve this change?</h1>
            <p className="mt-3 text-neutral-600">Your assistant asked to make this change to your portfolio:</p>
            <ul className="mt-4 list-disc space-y-1 rounded-2xl border border-neutral-200 p-4 pl-8">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="mt-4 text-sm text-neutral-600">It is saved as a version you can undo from History.</p>
            <div className="mt-6 flex gap-3">
              <button disabled={state === 'working'} onClick={() => decide('approve')} className="min-h-[48px] flex-1 rounded-full bg-neutral-900 px-5 font-medium text-white disabled:opacity-50">Approve</button>
              <button disabled={state === 'working'} onClick={() => decide('reject')} className="min-h-[48px] flex-1 rounded-full border border-neutral-300 px-5 font-medium disabled:opacity-50">Decline</button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
