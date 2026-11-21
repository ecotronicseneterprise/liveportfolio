'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import CopyButton from '@/components/docs/CopyButton'

// Where the person approves a change their assistant proposed (removing things, replacing a whole list, links, batches, restoring).
// The assistant gets only the link; it cannot press the button. A website cannot push a message into a chat, so after approving the
// person is told to go back and say "approved" (one tap to copy).
type Change = { label: string; before: string; after: string }
const CONFIRM = 'I approved it. Please confirm.'

function Changes({ changes, summary }: { changes: Change[]; summary: string[] }) {
  if (!changes.length) return <ul className="mt-4 list-disc space-y-1 rounded-2xl border border-neutral-200 p-4 pl-8">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
  return (
    <div className="mt-4 space-y-3">
      {changes.map((c) => (
        <div key={c.label} className="rounded-2xl border border-neutral-200 p-3">
          <p className="text-sm font-semibold">{c.label}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Before</p>
          <p className="rounded-lg bg-red-50 p-2 text-sm text-neutral-800 whitespace-pre-line">{c.before}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">After</p>
          <p className="rounded-lg bg-green-50 p-2 text-sm text-neutral-800 whitespace-pre-line">{c.after}</p>
        </div>
      ))}
    </div>
  )
}

export default function ApprovePage() {
  const [state, setState] = useState<'loading' | 'ready' | 'working' | 'done' | 'declined' | 'error'>('loading')
  const [summary, setSummary] = useState<string[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [message, setMessage] = useState('')
  const [id, setId] = useState('')
  const [closeFailed, setCloseFailed] = useState(false)

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
      setChanges(j.changes ?? [])
      setState('ready')
    })()
  }, [])

  const decide = async (decision: 'approve' | 'reject') => {
    setState('working')
    const res = await fetch('/api/mcp/proposals', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id, decision }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setMessage(j.message || 'That did not work.'); setState('error'); return }
    if (decision === 'approve') { setSummary(j.summary ?? summary); setChanges(j.changes ?? changes); setState('done') } else setState('declined')
  }

  const closeTab = () => { window.close(); setTimeout(() => setCloseFailed(true), 300) }

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
        {state === 'loading' && <p className="mt-6 text-neutral-600">Loading…</p>}
        {state === 'error' && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{message}</p>}
        {state === 'declined' && <p role="status" className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">Declined. Nothing was changed. You can tell your assistant.</p>}
        {(state === 'ready' || state === 'working') && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Approve this change?</h1>
            <p className="mt-2 text-neutral-600">Your assistant asked to change your portfolio like this:</p>
            <Changes changes={changes} summary={summary} />
            <p className="mt-4 text-sm text-neutral-600">It is saved as a version you can undo from History.</p>
            <div className="mt-6 flex gap-3">
              <button disabled={state === 'working'} onClick={() => decide('approve')} className="min-h-[48px] flex-1 rounded-full bg-neutral-900 px-5 font-medium text-white disabled:opacity-50">Approve</button>
              <button disabled={state === 'working'} onClick={() => decide('reject')} className="min-h-[48px] flex-1 rounded-full border border-neutral-300 px-5 font-medium disabled:opacity-50">Decline</button>
            </div>
          </>
        )}
        {state === 'done' && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Approved. Go back to your chat.</h1>
            <p className="mt-2 text-neutral-700">Your change is saved. Tell your assistant, so it can confirm:</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-[#0A66C2] bg-blue-50 p-3">
              <span className="text-base font-medium">{CONFIRM}</span>
              <CopyButton text={CONFIRM} label="Copy" />
            </div>
            <Changes changes={changes} summary={summary} />
            <p className="mt-4 text-sm text-neutral-600">You can undo it from History in your dashboard.</p>
            <button onClick={closeTab} className="mt-5 min-h-[48px] w-full rounded-full border border-neutral-300 px-5 font-medium">Close this tab</button>
            {closeFailed && <p className="mt-2 text-sm text-neutral-600">You can close this tab.</p>}
          </>
        )}
      </div>
    </main>
  )
}
