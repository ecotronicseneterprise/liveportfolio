'use client'

import StackInput from '@/components/dashboard/StackInput'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import TemplateGallery, { TemplateThumb, TEMPLATE_LABEL, useDebounced } from './TemplateGallery'
import { sanitizeDraft, type Draft, type DraftProject } from '@/lib/onboarding/draft'
import { draftToPreviewContent } from '@/lib/onboarding/preview-content'
import { useFlow } from '@/lib/onboarding/use-flow'
import { accountUrl } from '@/lib/onboarding/state'
import { t } from '@/lib/onboarding/t'
import { isProTemplate, isTemplateId, type TemplateId } from '@/lib/plans'
import { recommend } from '@/lib/blocks/presets'
import { projectImageUrl } from '@/lib/connectors/safe-url'
import { checkImageFile, toJpeg } from '@/lib/onboarding/image'
import FlowShell, { FlowLoading } from './ui/FlowShell'
import { AlertIcon } from './ui/icons'

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
  const avatarInput = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  // project images (hooks live up here, before the early return below)
  const imageInputs = useRef<Record<number, HTMLInputElement | null>>({})
  const [imgBusy, setImgBusy] = useState<number | null>(null)
  const [imgError, setImgError] = useState<Record<number, string>>({})

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
  // until the person picks a look, the one that suits their role and results is selected
  const recommended = useMemo(() => recommend(content).template as TemplateId, [content])

  if (flow.loading || !d) return <FlowLoading step="review" />

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v })
  const setProject = (i: number, p: Partial<DraftProject>) =>
    setD((cur) => {
      if (!cur) return cur
      const list = cur.projects.length ? cur.projects : [blankProject]
      return { ...cur, projects: list.map((x, j) => (j === i ? { ...x, ...p } : x)) }
    })

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return
    setAvatarError('')
    const check = checkImageFile(file)
    if (check !== 'ok') return setAvatarError(t(`review.image_${check}`))
    setAvatarBusy(true)
    try {
      const token = await flow.getToken()
      if (!token) return void router.replace(accountUrl('/create/review'))
      const blob = await toJpeg(file, 512, 0.86)
      const fd = new FormData()
      fd.append('file', blob, 'avatar.jpg')
      const res = await fetch('/api/upload-avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json().catch(() => ({}))
      const url = res.ok ? projectImageUrl(data?.url, process.env.NEXT_PUBLIC_SUPABASE_URL, 'avatars') : ''
      if (!url) throw new Error('upload')
      set('avatar_url', `${url}?v=${Date.now()}`)
    } catch {
      setAvatarError(t('review.imageFailed'))
    } finally {
      setAvatarBusy(false)
    }
  }

  // Project image: tap the button, pick a photo, it is shrunk here and uploaded with the person's own token; only the URL is kept.
  const imgMsg = (i: number, text: string) => setImgError((m) => ({ ...m, [i]: text }))
  const uploadImage = async (i: number, file: File | undefined) => {
    if (!file) return
    imgMsg(i, '')
    const check = checkImageFile(file)
    if (check !== 'ok') return imgMsg(i, t(`review.image_${check}`))
    setImgBusy(i)
    try {
      const token = await flow.getToken()
      if (!token) return void router.replace(accountUrl('/create/review')) // signed out: same rule as every step, back to sign-in and then here
      const blob = await toJpeg(file)
      const fd = new FormData()
      fd.append('file', blob, 'project.jpg')
      fd.append('index', String(i))
      const res = await fetch('/api/upload-project-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const j = await res.json().catch(() => ({}))
      const url = res.ok ? projectImageUrl(j?.url) : ''
      if (!url) throw new Error('upload')
      setProject(i, { image_url: `${url}?v=${Date.now()}` }) // same path on every upload: the version keeps a replaced image from showing stale
    } catch {
      imgMsg(i, t('review.imageFailed'))
    } finally {
      setImgBusy(null)
    }
  }
  const picked = new Set(d.projects.map((p) => p.title.toLowerCase()))
  const toggleCandidate = (id: string) => {
    const c = d.candidates.find((x) => x.id === id)
    if (!c) return
    if (picked.has(c.title.toLowerCase())) return set('projects', d.projects.filter((p) => p.title.toLowerCase() !== c.title.toLowerCase()))
    if (d.projects.filter((p) => p.title).length >= 20) return
    set('projects', [...d.projects.filter((p) => p.title), { title: c.title, description: c.description, stack: c.stack.join(', '), url: c.live_url ?? c.repo_url }])
  }

  const next = () => {
    if (!d.name.trim() || !d.role.trim()) return setError(t('review.needTitle'))
    // projects are optional: a portfolio without any is valid (the templates simply leave the section out)
    flow.saveDraft({ ...(sanitizeDraft({ ...d, status: 'reviewed' }) as Draft) })
    router.push('/create/address')
  }

  const field = (label: string, value: string, on: (v: string) => void, multiline = false) => (
    <label className="lp-field">
      <span className="lp-label">{label}</span>
      {multiline
        ? <textarea className="lp-textarea" value={value} onChange={(e) => on(e.target.value)} />
        : <input className="lp-input" value={value} onChange={(e) => on(e.target.value)} />}
    </label>
  )

  const template: TemplateId = isTemplateId(d.template) ? d.template : recommended
  const form = (
    <div className="lp-review-form">
      <h1 className="lp-title">{t('review.title')}</h1>
      <section className="lp-section">
        <div className="lp-field">
          <span className="lp-label">{t('review.profilePhoto')}</span>
          {d.avatar_url && <img className="lp-thumbimg" src={d.avatar_url} alt={t('portfolio.photoOf', { name: d.name || t('review.name') })} />}
          <div className="lp-img-actions">
            <button type="button" className="lp-btn lp-btn--ghost lp-btn--sm" disabled={avatarBusy} aria-busy={avatarBusy} onClick={() => avatarInput.current?.click()}>
              {avatarBusy ? t('review.imageUploading') : d.avatar_url ? t('review.imageReplace') : t('review.profilePhotoAdd')}
            </button>
            {d.avatar_url && <button type="button" className="lp-link" onClick={() => set('avatar_url', undefined)}>{t('review.imageRemove')}</button>}
          </div>
          <input ref={avatarInput} type="file" className="lp-sr" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label={t('review.profilePhoto')} onChange={(e) => { void uploadAvatar(e.target.files?.[0]); e.target.value = '' }} />
          {avatarError && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s2)' }}><AlertIcon />{avatarError}</p>}
          <p className="lp-fine" style={{ marginTop: 'var(--lp-s1)' }}>{t('review.profilePhotoHint')}</p>
        </div>
        {field(t('review.name'), d.name, (v) => set('name', v))}
        {field(t('review.role'), d.role, (v) => set('role', v))}
        {field(t('review.location'), d.location, (v) => set('location', v))}
        {field(t('review.bio'), d.bio, (v) => set('bio', v), true)}
        {field(t('review.github'), d.github_url, (v) => set('github_url', v))}
        {field(t('review.linkedin'), d.linkedin_url, (v) => set('linkedin_url', v))}
        <label className="lp-field">
          <span className="lp-label">{t('review.skills')}</span>
          <StackInput value={d.skills} onChange={(skills) => set('skills', skills)} className="lp-input" placeholder="Python, SQL, Figma" />
        </label>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">{t('review.projects')}</h2>
        {d.candidates.length > 0 && (
          <ul style={{ marginTop: 'var(--lp-s3)' }}>
            {d.candidates.map((c) => (
              <li key={c.id}><label className="lp-check">
                <input type="checkbox" checked={picked.has(c.title.toLowerCase())} onChange={() => toggleCandidate(c.id)} /> {c.title}
              </label></li>
            ))}
          </ul>
        )}
        {(d.projects.length ? d.projects : [blankProject]).map((p, i) => (
          <fieldset key={i} className="lp-repeat">
            {field('Title', p.title, (v) => setProject(i, { title: v }))}
            {field('Description', p.description, (v) => setProject(i, { description: v }), true)}
            {field('Stack', p.stack, (v) => setProject(i, { stack: v }))}
            {field('URL', p.url, (v) => setProject(i, { url: v }))}
            <div className="lp-field">
              <span className="lp-label">{t('review.projectImage')}</span>
              {p.image_url && <img className="lp-thumbimg" src={p.image_url} alt="" />}
              <div className="lp-img-actions">
                <button type="button" className="lp-btn lp-btn--ghost lp-btn--sm" disabled={imgBusy === i} aria-busy={imgBusy === i} onClick={() => imageInputs.current[i]?.click()}>
                  {p.image_url ? t('review.imageReplace') : t('review.imageAdd')}
                </button>
                {p.image_url && <button type="button" className="lp-link" onClick={() => setProject(i, { image_url: '' })}>{t('review.imageRemove')}</button>}
              </div>
              <input ref={(el) => { imageInputs.current[i] = el }} type="file" className="lp-sr" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label={t('review.projectImage')} onChange={(e) => { void uploadImage(i, e.target.files?.[0]); e.target.value = '' }} />
              {imgError[i] && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s2)' }}><AlertIcon />{imgError[i]}</p>}
              <p className="lp-fine" style={{ marginTop: 'var(--lp-s1)' }}>{t('review.imageHint')}</p>
            </div>
          </fieldset>
        ))}
        {d.projects.length < 20 && <button type="button" className="lp-link" style={{ marginTop: 'var(--lp-s3)' }} onClick={() => set('projects', [...d.projects, { ...blankProject }])}>+ project</button>}
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">{t('review.education')}</h2>
        {d.education.map((item, i) => (
          <fieldset key={i} className="lp-repeat">
            {field('Qualification', item.degree, (v) => set('education', d.education.map((x, j) => j === i ? { ...x, degree: v } : x)))}
            {field('Institution', item.institution, (v) => set('education', d.education.map((x, j) => j === i ? { ...x, institution: v } : x)))}
            {field('Year', item.year, (v) => set('education', d.education.map((x, j) => j === i ? { ...x, year: v } : x)))}
            {field('Grade (optional)', item.grade, (v) => set('education', d.education.map((x, j) => j === i ? { ...x, grade: v } : x)))}
            <button type="button" className="lp-link" onClick={() => set('education', d.education.filter((_, j) => j !== i))}>Remove education</button>
          </fieldset>
        ))}
        {d.education.length < 20 && <button type="button" className="lp-link" onClick={() => set('education', [...d.education, { degree: '', institution: '', year: '', grade: '' }])}>+ education</button>}
        <label className="lp-field">
          <span className="lp-label">{t('review.certifications')}</span>
          <textarea className="lp-textarea" value={d.certifications.join('\n')} onChange={(e) => set('certifications', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} />
        </label>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">{t('review.experience')}</h2>
        {d.experience.map((e, i) => (
          <fieldset key={i} className="lp-repeat">
            {field('Company', e.company, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, company: v } : x))))}
            {field('Role', e.role, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, role: v } : x))))}
            {field('Period', e.period, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, period: v } : x))))}
            {field('Highlights (one per line)', e.bullets, (v) => set('experience', d.experience.map((x, j) => (j === i ? { ...x, bullets: v } : x))), true)}
          </fieldset>
        ))}
        <button type="button" className="lp-link" style={{ marginTop: 'var(--lp-s3)' }} onClick={() => set('experience', [...d.experience, { company: '', role: '', period: '', bullets: '' }])}>+ experience</button>
      </section>

      {error && <p role="alert" className="lp-msg lp-msg--error" style={{ marginTop: 'var(--lp-s5)' }}><AlertIcon />{error}</p>}
      <div className="lp-desktop-only lp-actions">
        <button type="button" className="lp-btn lp-btn--primary" onClick={next}>{t('review.next')}</button>
      </div>
    </div>
  )

  // The template picker sits on top of the live preview (laptop) and of the preview sheet (phone): switch looks while editing.
  const picker = (
    <>
      <TemplateGallery compact content={content} selected={template} isPro={isPro} onSelect={(id) => set('template', id)} />
      {isProTemplate(template) && !isPro && (
        <p role="status" className="lp-msg">{TEMPLATE_LABEL[template]} is included with Pro. You can keep previewing it; when you publish, Basic uses Minimal and Pro uses {TEMPLATE_LABEL[template]}.</p>
      )}
    </>
  )

  return (
    <FlowShell step="review" wide>
      <div className="lp-review">
        {form}
        {/* desktop: live preview of the chosen template, always visible */}
        <aside className="lp-preview" aria-label="Live preview">
          <div className="lp-preview-in">
            <p className="lp-preview-cap"><span>{t('ui.livePreview')}</span><b>{TEMPLATE_LABEL[template]}</b></p>
            {picker}
            <div className="lp-frame">
              <TemplateThumb id={template} content={live} height="100%" eager scrollable />
            </div>
          </div>
        </aside>
      </div>
      {/* phone: Preview and Continue under the thumb, and a sheet */}
      <div className="lp-mbar lp-mobile-only">
        <button type="button" className="lp-btn lp-btn--ghost lp-btn--stack" onClick={() => setSheet(true)}>
          <span>{t('ui.preview')}</span><small>{t('ui.previewSub')}</small>
        </button>
        <button type="button" className="lp-btn lp-btn--primary" onClick={next}>{t('review.next')}</button>
      </div>
      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Preview" className="lp-sheet lp-mobile-only">
          <div className="lp-sheet-top">
            <span>{TEMPLATE_LABEL[template]}</span>
            <button ref={closeRef} type="button" className="lp-link" onClick={() => setSheet(false)}>{t('ui.close')}</button>
          </div>
          <div className="lp-sheet-pick">{picker}</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <TemplateThumb id={template} content={live} height="100%" eager scrollable />
          </div>
        </div>
      )}
      <div className="lp-mobile-only" style={{ height: '5.5rem' }} aria-hidden="true" />
    </FlowShell>
  )
}
