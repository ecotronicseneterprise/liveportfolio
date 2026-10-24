import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { sanitizeDraft, type Draft } from '../lib/onboarding/draft'
import { draftToPreviewContent, PLACEHOLDER } from '../lib/onboarding/preview-content'
import { ALL_TEMPLATES } from '../lib/plans'

const ROOT = path.resolve(__dirname, '..')

describe('draftToPreviewContent', () => {
  it('an empty draft already reads like a portfolio (placeholders everywhere a template needs text)', () => {
    const c = draftToPreviewContent(null, '')
    expect(c.name).toBe(PLACEHOLDER.name)
    expect(c.role).toBe(PLACEHOLDER.role)
    expect(c.headline).toBe(PLACEHOLDER.role)
    expect(c.about).toBe(PLACEHOLDER.about)
    expect(c.email).toBe(PLACEHOLDER.email)
    expect(c.skills.length).toBeGreaterThan(0)
    expect(c.projects).toHaveLength(1)
    expect(c.experience).toHaveLength(1)
    expect(c.skills_grouped[0].items).toEqual(c.skills)
  })
  it('real values replace placeholders field by field; blank rows are dropped', () => {
    const d = sanitizeDraft({
      name: 'Ada Okonkwo', role: 'Backend engineer', bio: 'I build payment systems.', skills: ['Go'],
      projects: [{ title: 'Invoice parser', description: 'Reads invoices', stack: 'python, postgres', url: 'https://x.dev' }, { title: '' }],
      experience: [{ company: 'Acme', role: 'Dev', period: '2021', bullets: 'a\n\nb' }, { company: '', role: '' }],
      education: [{ degree: 'BSc', institution: 'U', year: '2019' }, { degree: '' }],
    }) as Draft
    const c = draftToPreviewContent(d, 'ada@example.com')
    expect(c.name).toBe('Ada Okonkwo')
    expect(c.email).toBe('ada@example.com')
    expect(c.projects).toEqual([{ title: 'Invoice parser', problem: 'Reads invoices', solution: '', outcome: '', stack: ['python', 'postgres'], url: 'https://x.dev/' }])
    expect(c.experience).toEqual([{ company: 'Acme', role: 'Dev', period: '2021', bullets: ['a', 'b'] }])
    expect(c.education).toHaveLength(1)
  })
  it('never lets markup through: the draft is already sanitised and the templates render text, not HTML', () => {
    const d = sanitizeDraft({ name: '<img src=x onerror=alert(1)>', github_url: 'javascript:alert(1)' }) as Draft
    const c = draftToPreviewContent(d, '')
    expect(c.github_url).toBeUndefined()
    expect(JSON.stringify(c)).not.toContain('javascript:')
  })
})

describe('templates and fonts', () => {
  it('no template or app source requests fonts from Google at runtime (self-hosted instead)', () => {
    for (const id of ['Minimal', 'Bold', 'Creative', 'Developer', 'Designer', 'DataScientist', 'ProductManager', 'Finance', 'Graduate', 'Cybersecurity']) {
      const src = fs.readFileSync(path.join(ROOT, `components/templates/${id}.tsx`), 'utf8')
      expect(src, id).not.toMatch(/fonts\.googleapis|fonts\.gstatic/)
    }
    const css = fs.readFileSync(path.join(ROOT, 'components/templates/template-fonts.css'), 'utf8')
    expect(css).not.toMatch(/https?:\/\//)
    for (const fam of ['Space Grotesk', 'Fraunces', 'JetBrains Mono', 'Share Tech Mono', 'Inter', 'IBM Plex Mono', 'IBM Plex Sans', 'Syne', 'DM Sans', 'Playfair Display', 'Nunito', 'Plus Jakarta Sans']) {
      expect(css, fam).toContain(`font-family: '${fam}'`)
    }
  })
  it('every template id has a lazy loader and a label (the map cannot lag behind plans.ts)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'components/templates/dynamic.ts'), 'utf8')
    for (const id of ALL_TEMPLATES) {
      expect(src, id).toContain(`'${id}'`.replace(/^'([a-z]+)'$/, '$1:') === `${id}:` ? `${id}:` : `'${id}':`)
    }
  })
})
