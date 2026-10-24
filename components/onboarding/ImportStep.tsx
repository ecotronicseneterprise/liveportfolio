'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftFromImport, sanitizeDraft } from '@/lib/onboarding/draft'
import { useFlow } from '@/lib/onboarding/use-flow'
import { accountUrl } from '@/lib/onboarding/state'
import { normalizeGithubInput } from '@/lib/connectors/safe-url'
import { t } from '@/lib/onboarding/t'
import type { ImportDraft } from '@/lib/connectors/types'

// GitHub and pasted text go through /api/import, which is switched on server-side by IMPORT_ENABLED; this flag only
// decides whether the two cards are shown. With it off the page shows Upload CV and Fill in manually.
const IMPORT_UI = process.env.NEXT_PUBLIC_IMPORT_ENABLED === 'true'
type Mode = 'file' | 'github' | 'paste'

const CARD = 'flex flex-col items-start justify-between text-start border rounded p-3 min-h-28 w-full focus-visible:outline focus-visible:outline-2'

/**
 * The import step: four equal blocks (2 x 2): Upload CV, GitHub username or link, Paste text, Fill in manually.
 * Every call carries the Bearer token (the routes are authenticated and limited per user for it).
 * GitHub: a username, github.com/user or a full profile URL goes in; the review form comes back with up to 4 projects ticked.
 */
export default function ImportStep() {
  const router = useRouter()
  const flow = useFlow('import')
  const [mode, setMode] = useState<Mode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [github, setGithub] = useState('')
  const [prefilled, setPrefilled] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // GitHub sign-in: suggest the username (already validated against GitHub's login rules); the person can change it
  useEffect(() => {
    if (prefilled || flow.loading || !flow.provider.githubLogin || !IMPORT_UI) return
    setPrefilled(true)
    setGithub(flow.provider.githubLogin)
    setMode('github')
  }, [prefilled, flow.loading, flow.provider.githubLogin])

  const run = async () => {
    setError('')
    const fd = new FormData()
    let url = '/api/import'
    if (mode === 'file') {
      if (!file) return setError(t('import.noFile'))
      fd.append('file', file)
      url = '/api/parse-cv'
    } else if (mode === 'github') {
      const login = normalizeGithubInput(github)
      if (!login) return setError(t('import.githubBad'))
      fd.append('github', login)
    } else {
      if (!text.trim()) return setError(t('import.failed'))
      fd.append('text', text)
    }
    setBusy(true)
    try {
      const token = await flow.getToken()
      if (!token) return void router.replace(accountUrl('/create/import'))
      const res = await fetch(url, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return void router.replace(accountUrl('/create/import'))
      if (!res.ok) return setError(res.status === 429 ? t('import.limit') : res.status === 404 && data?.error === 'disabled' ? t('import.disabled') : t('import.failed'))
      const imp = (data.draft ?? data) as Partial<ImportDraft>
      flow.saveDraft(draftFromImport(imp, flow.draft))
      router.push('/create/review')
    } catch {
      setError(t('import.failed'))
    } finally {
      setBusy(false)
    }
  }

  const manual = () => {
    flow.saveDraft(sanitizeDraft({ status: 'imported' })!)
    router.push('/create/review')
  }

  if (flow.loading) return <p className="p-6">…</p>

  const pick = (m: Mode) => { setMode(m); setError('') }
  const card = (m: Mode, title: string, hint: string, badge?: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => pick(m)}
      className={CARD}
      style={{ borderColor: mode === m ? '#111' : '#d1d5db', borderWidth: mode === m ? 2 : 1 }}
    >
      <span className="font-semibold">{title}</span>
      <span className="text-sm">{hint}</span>
      {badge && <span className="text-xs border rounded px-1.5 mt-1">{badge}</span>}
    </button>
  )

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('import.title')}</h1>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label={t('import.title')}>
        {card('file', t('import.file'), t('import.fileHint'), t('import.recommended'))}
        {IMPORT_UI && card('github', t('import.github'), t('import.githubHint'))}
        {IMPORT_UI && card('paste', t('import.paste'), t('import.pasteHint'))}
        <button type="button" onClick={manual} className={CARD} style={{ borderColor: '#d1d5db', borderWidth: 1 }}>
          <span className="font-semibold">{t('import.manual')}</span>
          <span className="text-sm">{t('import.manualHint')}</span>
        </button>
      </div>

      <div className="mt-4">
        {mode === 'file' && (
          <input type="file" aria-label={t('import.file')} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}
        {mode === 'github' && IMPORT_UI && (
          <label className="block">{t('import.github')}
            <input className="block w-full border rounded px-3 min-h-11" placeholder="octocat, github.com/octocat" autoComplete="off" autoCapitalize="none" spellCheck={false} value={github} onChange={(e) => setGithub(e.target.value)} />
          </label>
        )}
        {mode === 'paste' && IMPORT_UI && (
          <textarea aria-label={t('import.paste')} className="block w-full border rounded p-3 min-h-40" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {error && <p role="alert" className="text-red-700 mt-3">{error}</p>}
        <button type="button" disabled={busy} className="min-h-12 px-4 border rounded mt-3" onClick={run}>{busy ? t('import.reading') : t('import.run')}</button>
      </div>

      <p className="text-sm mt-6">{t('import.aiNotice')}</p>
    </main>
  )
}
