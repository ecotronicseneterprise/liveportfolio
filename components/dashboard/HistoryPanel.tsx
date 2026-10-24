'use client'

import { useCallback, useEffect, useState } from 'react'

interface Revision {
  id: string
  created_at: string
  source: 'dashboard' | 'assistant' | 'restore'
  summary: string[]
}

const WHO: Record<Revision['source'], string> = { dashboard: 'You edited', assistant: 'Assistant edited', restore: 'You restored' }

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * History and undo. Each row is the portfolio as it was BEFORE one change; "Go back to this" restores it. Restoring is itself
 * recorded, so it can be undone too. Renders nothing until the revisions table exists (the API reports `available: false`).
 */
export default function HistoryPanel({
  token,
  refreshKey,
  onRestored,
}: {
  token: string
  refreshKey: number
  onRestored: (r: { content: Record<string, unknown>; template: string; health_score?: number }) => void
}) {
  const [rows, setRows] = useState<Revision[] | null>(null)
  const [available, setAvailable] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/revisions', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = (await res.json()) as { available: boolean; revisions: Revision[] }
      setAvailable(j.available)
      setRows(j.revisions)
    } catch {
      // history is optional; the editor works without it
    }
  }, [token])

  useEffect(() => { void load() }, [load, refreshKey])

  async function restore(id?: string) {
    setBusy(id ?? 'latest'); setMsg(null); setConfirm(null)
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(id ? { revision_id: id } : { latest: true }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, text: j.message || 'Could not go back. Please try again.' }); return }
      onRestored({ content: j.content, template: j.template, health_score: j.health_score })
      setMsg({ ok: true, text: 'Done. Your portfolio is back to that version.' })
      await load()
    } catch {
      setMsg({ ok: false, text: 'Could not go back. Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  if (!available || rows === null) return null

  return (
    <section aria-labelledby="history-h" className="pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 id="history-h" className="text-base font-semibold text-gray-900">History</h3>
          <p className="text-sm text-gray-600">Every save keeps the version before it. Go back any time.</p>
        </div>
        <button
          type="button"
          onClick={() => restore()}
          disabled={busy !== null || rows.length === 0}
          className="min-h-[44px] px-4 border border-gray-300 text-sm font-medium text-gray-900 rounded-full hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === 'latest' ? 'Going back…' : 'Undo last change'}
        </button>
      </div>

      <p role="status" aria-live="polite" className={`text-sm mt-2 min-h-[20px] ${msg?.ok ? 'text-green-700' : 'text-red-700'}`}>{msg?.text ?? ''}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 mt-2">Nothing yet. Your next save will appear here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100 border-t border-b border-gray-100">
          {rows.slice(0, 10).map((r) => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{WHO[r.source]}</span>
                  <span className="text-gray-600"> · {ago(r.created_at)}</span>
                </p>
                <p className="text-sm text-gray-600 break-words">{r.summary.length ? r.summary.slice(0, 3).join(', ') + (r.summary.length > 3 ? `, and ${r.summary.length - 3} more` : '') : 'A change'}</p>
              </div>
              {confirm === r.id ? (
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => restore(r.id)} disabled={busy !== null} className="min-h-[44px] px-3 bg-[#0A66C2] text-white text-sm font-medium rounded-full hover:bg-[#084D9A] disabled:opacity-50">
                    {busy === r.id ? 'Going back…' : 'Yes, go back'}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="min-h-[44px] px-3 text-sm text-gray-700 hover:underline">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(r.id)} disabled={busy !== null} className="min-h-[44px] px-3 shrink-0 text-sm font-medium text-[#0A66C2] hover:underline disabled:opacity-50" aria-label={`Go back to before: ${r.summary[0] ?? 'this change'}`}>
                  Go back to this
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
