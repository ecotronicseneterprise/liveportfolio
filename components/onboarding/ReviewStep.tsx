'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import TemplateGallery, { TemplateThumb, TEMPLATE_LABEL, useDebounced } from './TemplateGallery'
import { sanitizeDraft, type Draft, type DraftProject } from '@/lib/onboarding/draft'
import { draftToPreviewContent } from '@/lib/onboarding/preview-content'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'
import { isProTemplate, isTemplateId, type TemplateId } from '@/lib/plans'

const blankProject: DraftProject = { title: '', description: '', stack: '', url: '' }

/**
 * Review: edit what was read and pick a look. Desktop: the form on the left, a live preview of the chosen template on the
 * right (sticky). Phone: a "Preview" button opens the same preview in a sheet. Only the reviewed fields are kept
 * (lib/onboarding/draft.ts).
 */
export default function ReviewStep() {
  const router = useRouter()
  const flow = useFlow('review')
  const [d, setD] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (flow.loading) return
    const base = flow.draft ?? sanitizeDraft({ status: 'imported' })!
    // social sign-in: suggest the provider name when the draft has none yet
    setD(base.name || !flow.provider.name ? base : { ...base, name: flow.provider.name })
  }, [flow.loading, flow.draft, flow.provider.name])

  // the plan only decides the lock badge here; the server enforces what can actually be saved or published
  useEffect(() => {
    if (flow.loading) return
    let alive = true
    void flow.getToken().then((token) => {
      if (!token) return
      fetch('/api/user-plan', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((j) => { if (alive) setIsPro(j?.plan === 'pro') }).catch(() => {})
    })
    return () => { alive = false }
  }, [flow.loading, flow.getToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sheet) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  const content = useMemo(() => draftToPreviewContent(d, flow.email ?? ''), [d, flow.email])
  const live = useDebounced(content, 300)

  if (flow.loading || !d) return <p className="p-6">…</p>

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v })
  const setProject = (i: number, p: Partial<DraftProject>) => set('projects', d.projects.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const picked = new Set(d.projects.map((p) => p.title.toLowerCase()))
  const toggleCandidate = (id: string) => {
    const c = d.candidates.find((x) => x.id === id)
    if (!c) return
    if (picked.has(c.title.toLowerCase())) return set('projects', d.projects.filter((p) => p.title.toLowerCase() !== c.title.toLowerCase()))
    if (d.projects.filter((p) => p.title).length >= 4) return
    set('projects', [...d.projects.filter((p) => p.title), { title: c.title, description: c.description, stack: c.stack.join(', '), url: c.live_url ?? c.repo_url }])
  }

  const next = () => {
    if (!d.name.trim() || !d.role.trim()) return setError(t('review.needTitle'))
    if (!d.projects.some((p) => p.title.trim())) return setError(t('review.needProject'))
    flow.saveDraft({ ...(sanitizeDraft({ ...d, status: 'reviewed' }) as Draft) })
    router.push('/create/address')
  }

  const field = (label: string, value: string, on: (v: string) => void, multiline = false) => (
    <label className="block mb-3">{label}
      {multiline
        ? <textarea className="block w-full border rounded p-2 min-h-24" value={value} onChange={(e) => on(e.target.value)} />
        : <input className="block w-full border rounded px-3 min-h-11" value={value} onChange={(e) => on(e.target.value)} />}
    </label>
  )

  const template: TemplateId = isTemplateId(d.template) ? d.template : 'minimal'
  const form = (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{t('review.title')}</h1>
      {field(t('review.name'), d.name, (v) => set('name', v))}
      {field(t('review.role'), d.role, (v) => set('role', v))}
      {field(t('review.location'), d.location, (v) => set('location', v))}
      {field(t('review.bio'), d.bio, (v) => set('bio', v), true)}
      {field(t('review.github'), d.github_url, (v) => set('github_url', v))}
      {field(t('review.linkedin'), d.linkedin_url, (v) => set('linkedin_url', v))}
      {field(t('review.skills'), d.skills.join(', '), (v) => set('skills', v.split(',').map((x) => x.trim()).filter(Boolean)))}

      <h2 className="text-lg font-semibold mt-6 mb-2">{t('review.projects')}</h2>
      {d.candidates.length > 0 && (
        <ul className="mb-3">
          {d.candidates.map((c) => (
            <li key={c.id}><label className="inline-flex items-center gap-2 min-h-11">
              <input type="checkbox" checked={picked.has(c.title.toLowerCase())} onChange={() => toggleCandidate(c.id)} /> {c.title}
            </label></li>
          ))}
        </ul>
      )}
      {(d.projects.length ? d.projects : [blankProject]).map((p, i) => (
        <fieldset key={i} className="border rounded p-3 mb-3">
          {field('Title', p.title, (v) => setProject(i, { title: v }))}
          {field('Description', p.description, (v) => setProject(i, { description: v }), true)}
          {field('Stack', p.stack, (v) => setProject(i, { stack: v }))}
          {field('URL', p.url, (v) => setProject(i, { url: v }))}
        </fieldset>
      ))}
      {d.projects.length < 4 && <button type="button" className="underline min-h-11" onClick={() => set('projects', [...d.projects, { ...blankProject }])}>+ project</button>}

      <h2 className="text-lg font-semibold mt-6 mb-2">{t('review.experience')}</h2>
      {d.experience.map((e, i) => (
        <fieldset key={i} className="border rounded p-3 mb-3">
          {field('Company', e.company, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, company: v } : x))))}
          {field('Role', e.role, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, role: v } : x))))}
          {field('Period', e.period, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, period: v } : x))))}
          {field('Highlights (one per line)', e.bullets, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, bullets: v } : x))), true)}
        </fieldset>
      ))}
      <button type="button" className="underline min-h-11" onClick={() => set('experience', [...d.experience, { company: '', role: '', period: '', bullets: '' }])}>+ experience</button>

      <h2 className="text-lg font-semibold mt-6 mb-2">{t('review.template')}</h2>
      <TemplateGallery content={content} selected={template} isPro={isPro} onSelect={(id) => set('template', id)} />
      {isProTemplate(template) && !isPro && (
        <p role="status" className="text-sm mt-2">{TEMPLATE_LABEL[template]} is included with Pro. You can keep previewing it; when you publish, Basic uses Minimal and Pro uses {TEMPLATE_LABEL[template]}.</p>
      )}

      {error && <p role="alert" className="text-red-700 my-3">{error}</p>}
      <button type="button" className="min-h-12 px-4 border rounded mt-4" onClick={next}>{t('review.next')}</button>
    </div>
  )

  return (
    <main className="max-w-6xl mx-auto p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      {form}
      {/* desktop: live preview of the chosen template, always visible */}
      <aside className="hidden lg:block" aria-label="Live preview">
        <div className="sticky top-4 border rounded overflow-hidden">
          <TemplateThumb id={template} content={live} height={'calc(100svh - 2rem)'} eager scrollable />
        </div>
      </aside>
      {/* phone: a Preview button and a sheet */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 p-3 bg-white border-t" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button type="button" className="w-full min-h-12 border rounded" onClick={() => setSheet(true)}>Preview</button>
      </div>
      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Preview" className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <span>{TEMPLATE_LABEL[template]}</span>
            <button ref={closeRef} type="button" className="min-h-11 px-3 underline" onClick={() => setSheet(false)}>Close</button>
          </div>
          <div className="flex-1 min-h-0">
            <TemplateThumb id={template} content={live} height="100%" eager scrollable />
          </div>
        </div>
      )}
      <div className="lg:hidden h-20" aria-hidden="true" />
    </main>
  )
}
