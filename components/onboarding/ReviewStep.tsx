'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sanitizeDraft, type Draft, type DraftProject } from '@/lib/onboarding/draft'
import { useFlow } from '@/lib/onboarding/use-flow'
import { t } from '@/lib/onboarding/t'

const TEMPLATES = ['minimal', 'bold', 'creative', 'developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'cybersecurity', 'graduate']
const blankProject: DraftProject = { title: '', description: '', stack: '', url: '' }

/** Review: edit what was read. Only these reviewed fields are kept (see lib/onboarding/draft.ts). */
export default function ReviewStep() {
  const router = useRouter()
  const flow = useFlow('review')
  const [d, setD] = useState<Draft | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (flow.loading) return
    const base = flow.draft ?? sanitizeDraft({ status: 'imported' })!
    // social sign-in: suggest the provider name when the draft has none yet
    setD(base.name || !flow.provider.name ? base : { ...base, name: flow.provider.name })
  }, [flow.loading, flow.draft, flow.provider.name])
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

  return (
    <main className="max-w-2xl mx-auto p-6">
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
      {d.projects.length < 4 && <button className="underline min-h-11" onClick={() => set('projects', [...d.projects, { ...blankProject }])}>+ project</button>}

      <h2 className="text-lg font-semibold mt-6 mb-2">{t('review.experience')}</h2>
      {d.experience.map((e, i) => (
        <fieldset key={i} className="border rounded p-3 mb-3">
          {field('Company', e.company, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, company: v } : x))))}
          {field('Role', e.role, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, role: v } : x))))}
          {field('Period', e.period, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, period: v } : x))))}
          {field('Highlights (one per line)', e.bullets, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, bullets: v } : x))), true)}
        </fieldset>
      ))}
      <button className="underline min-h-11" onClick={() => set('experience', [...d.experience, { company: '', role: '', period: '', bullets: '' }])}>+ experience</button>

      <label className="block mt-6 mb-3">{t('review.template')}
        <select className="block border rounded min-h-11 px-2" value={d.template} onChange={(e) => set('template', e.target.value)}>
          {TEMPLATES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
      <button className="min-h-12 px-4 border rounded" onClick={next}>{t('review.next')}</button>
    </main>
  )
}
