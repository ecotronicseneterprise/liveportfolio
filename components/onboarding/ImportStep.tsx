'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftFromImport, sanitizeDraft } from '@/lib/onboarding/draft'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'
import type { ImportDraft } from '@/lib/connectors/types'

const GITHUB_ENABLED = process.env.NEXT_PUBLIC_IMPORT_ENABLED === 'true'
type Mode = 'file' | 'github' | 'paste'

/** The import step. Every call carries the Bearer token (the routes are authenticated + per-user limited for it). */
export default function ImportStep() {
  const router = useRouter()
  const flow = useFlow('import')
  const [mode, setMode] = useState<Mode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [github, setGithub] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setError(''); setBusy(true)
    try {
      const token = await flow.getToken()
      if (!token) return void router.replace('/create/account')
      const fd = new FormData()
      let url = '/api/import'
      if (mode === 'file') {
        if (!file) return setError(t('import.failed'))
        fd.append('file', file)
        url = '/api/parse-cv'
      } else if (mode === 'github') {
        fd.append('github', github.trim())
      } else {
        fd.append('text', text)
      }
      const res = await fetch(url, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return void router.replace('/create/account')
      if (!res.ok) return setError(res.status === 429 ? t('import.limit') : t('import.failed'))
      const imp = (data.draft ?? data) as Partial<ImportDraft>
      flow.saveDraft(draftFromImport(imp, flow.draft))
      router.push('/create/review')
    } catch {
      setError(t('import.failed'))
    } finally {
      setBusy(false)
    }
  }

  const blank = () => {
    flow.saveDraft(sanitizeDraft({ status: 'imported' })!)
    router.push('/create/review')
  }

  if (flow.loading) return <p className="p-6">…</p>
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('import.title')}</h1>
      <div role="tablist" className="flex flex-wrap gap-2 mb-4">
        <button role="tab" aria-selected={mode === 'file'} className="min-h-11 px-3 border rounded" onClick={() => setMode('file')}>{t('import.file')}</button>
        {GITHUB_ENABLED && <button role="tab" aria-selected={mode === 'github'} className="min-h-11 px-3 border rounded" onClick={() => setMode('github')}>{t('import.github')}</button>}
        {GITHUB_ENABLED && <button role="tab" aria-selected={mode === 'paste'} className="min-h-11 px-3 border rounded" onClick={() => setMode('paste')}>{t('import.paste')}</button>}
      </div>
      {mode === 'file' && <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
      {mode === 'github' && <input className="block w-full border rounded px-3 min-h-11" placeholder="octocat" value={github} onChange={(e) => setGithub(e.target.value)} />}
      {mode === 'paste' && <textarea className="block w-full border rounded p-3 min-h-40" value={text} onChange={(e) => setText(e.target.value)} />}
      <p className="text-sm my-3">{t('import.aiNotice')}</p>
      {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
      <button disabled={busy} className="min-h-12 px-4 border rounded" onClick={run}>{busy ? t('import.reading') : t('import.run')}</button>
      <button className="block mt-4 underline min-h-11" onClick={blank}>{t('import.blank')}</button>
    </main>
  )
}
