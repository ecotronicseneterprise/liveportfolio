'use client'
// "Your CV": download the portfolio as a PDF (every plan) or a Word file (Pro). The file is built on the server from the SAVED portfolio at the
// moment you click, so it is never out of date and nothing is stored. The "left out" list comes from the export's own report, not a guess.
import { useCallback, useEffect, useState } from 'react'

interface Omitted { section: string; item: string; reason: string }

const REASON: Record<string, string> = {
  contact_excluded: 'left out because you chose not to include contact details',
  link_not_valid: 'the address is not a web address, so it is not printed',
  over_cap: 'more than the CV holds, as on your page',
  incomplete_entry: 'missing a required part (for example an award with no issuer)',
  text_cut: 'longer than the limit, so it is cut at the limit',
  not_shown_on_page: 'not shown on your page either',
  not_cv_content: 'not part of a CV',
}

export default function CvCard({ accessToken, isPro, refreshKey, onUpgrade }: { accessToken: string; isPro: boolean; refreshKey?: unknown; onUpgrade: () => void }) {
  const [contact, setContact] = useState(true)
  const [omitted, setOmitted] = useState<Omitted[] | null>(null)
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState('')
  const [showList, setShowList] = useState(false)

  const loadReport = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/cv?report=1&contact=${contact ? 1 : 0}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) { setOmitted(null); return }
      const j = (await res.json()) as { omitted?: Omitted[] }
      setOmitted(Array.isArray(j.omitted) ? j.omitted : [])
    } catch { setOmitted(null) }
  }, [accessToken, contact])
  useEffect(() => { void loadReport() }, [loadReport, refreshKey])

  async function download(format: 'pdf' | 'docx') {
    setError('')
    setBusy(format)
    try {
      const res = await fetch(`/api/cv?format=${format}&contact=${contact ? 1 : 0}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 403 && j.error === 'upgrade_required') { onUpgrade(); return }
        setError(res.status === 429 ? 'You have downloaded a lot this hour. Please try again later.' : 'The CV could not be built right now. Please try again.')
        return
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `cv.${format}`
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    } catch {
      setError('The CV could not be downloaded. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  // What the person should be told about: everything except what is not a CV by design (the photo and testimonials are listed separately, quietly).
  const real = (omitted ?? []).filter((o) => o.reason !== 'not_cv_content')
  const quiet = (omitted ?? []).filter((o) => o.reason === 'not_cv_content')

  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }} aria-labelledby="cv-card-title">
      <p id="cv-card-title" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your CV</p>
      <p className="text-sm text-gray-600 mb-4">Built from your saved portfolio each time you download, so it is never out of date. Plain, one-column layout that recruiters&apos; systems can read.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={() => download('pdf')} disabled={busy !== null}
          className="min-h-[44px] text-sm px-4 py-2 bg-[#0A66C2] text-white rounded-full hover:bg-[#084D9A] transition-colors font-medium disabled:opacity-60">
          {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
        </button>
        {isPro ? (
          <button type="button" onClick={() => download('docx')} disabled={busy !== null}
            className="min-h-[44px] text-sm px-4 py-2 bg-[#F3F4F6] text-gray-800 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors font-medium disabled:opacity-60">
            {busy === 'docx' ? 'Preparing…' : 'Download Word (.docx)'}
          </button>
        ) : (
          <button type="button" onClick={onUpgrade}
            className="min-h-[44px] text-sm px-4 py-2 bg-[#F3F4F6] text-gray-700 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors font-medium">
            Word (.docx) <span className="text-xs text-gray-500">Pro</span>
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 min-h-[44px]">
        <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} className="h-4 w-4" />
        Include my email, phone and WhatsApp
      </label>

      {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}

      <div className="mt-2 text-sm" aria-live="polite">
        {omitted === null ? null : real.length === 0 ? (
          <p className="text-gray-600">Nothing from your portfolio is left out of this CV.{quiet.length ? ' (Your photo and testimonials are not part of a CV.)' : ''}</p>
        ) : (
          <div>
            <p className="text-gray-800">
              Left out of this CV: {real.length} {real.length === 1 ? 'item' : 'items'}.{' '}
              <button type="button" className="underline text-blue-700 min-h-[44px]" aria-expanded={showList} onClick={() => setShowList((v) => !v)}>{showList ? 'Hide the list' : 'Show the list'}</button>
            </p>
            {showList && (
              <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                {real.map((o, i) => <li key={`${o.section}-${i}`}><span className="font-medium">{o.section}: {o.item}</span>, {REASON[o.reason] ?? o.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
