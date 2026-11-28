// CV export (PDF and DOCX). The invariant, same shape as display-all.test.ts: EVERYTHING stored in a portfolio either appears in the
// generated file or is listed in the report with a reason. Checked on the real bytes: the PDF is parsed with pdf.js, the DOCX is unzipped.
//
// Matching rule: content presence is strict, layout is loose. PDF text extraction wraps lines, splits long addresses and orders items by
// position, so both sides are squashed (NFC, no whitespace, no soft hyphens or zero-width marks) before comparing. Order is only checked
// between entries and between bullets of the same section.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import { buildCvModel, hasSection, type CvModel } from '@/lib/cv/model'
import { renderPdf } from '@/lib/cv/pdf'
import { renderDocx } from '@/lib/cv/docx'
import { cvFilename, exportCv } from '@/lib/cv/export'
import { entitlementsFor } from '@/lib/plans'
import { SAMPLE_PEOPLE, SPARSE } from '@/lib/blocks/sample'
import type { PortfolioContent } from '@/components/templates/Minimal'

const ROOT = path.resolve(__dirname, '..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

// ── extraction helpers ──────────────────────────────────────────────────────────────────────────────────────────────
const squash = (t: string) => t.normalize('NFC').replace(/[\s­​-‍⁠﻿]+/g, '')

async function pdfText(buf: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: false }).promise
  let out = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent()
    out += (tc.items as Array<{ str?: string }>).map((i) => i.str ?? '').join(' ') + '\n'
  }
  return out
}
async function docxParts(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml')!.async('string')
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join('\n')
  return { zip, xml, text, files: Object.keys(zip.files) }
}

/** Every string the model prints, in print order, so the same list drives both formats. */
function printed(m: CvModel): string[] {
  const out: string[] = [m.name, ...m.title, ...m.contactLine, ...m.links]
  for (const k of m.order) {
    if (!hasSection(m, k)) continue
    if (k === 'summary') out.push(...m.summary)
    if (k === 'experience') for (const e of m.experience) out.push(e.role, e.company, e.period, ...e.bullets)
    if (k === 'skills') for (const g of m.skills) out.push(g.category, ...g.items)
    if (k === 'projects') for (const p of m.projects) out.push(p.title, ...p.stack, p.problem, p.solution, p.outcome, p.url ?? '', p.sourceUrl ?? '')
    if (k === 'education') out.push(...m.education)
    if (k === 'certifications') out.push(...m.certifications)
    if (k === 'awards') for (const a of m.awards) out.push(a.title, a.issuer, a.year, a.description, a.url ?? '')
  }
  return out.filter(Boolean)
}

// ── fixtures ────────────────────────────────────────────────────────────────────────────────────────────────────────
const maximal = (): PortfolioContent => {
  const base = JSON.parse(JSON.stringify(SAMPLE_PEOPLE.engineer)) as PortfolioContent
  return {
    ...base,
    name: 'Ọláwálé Ṣẹ́gun Adéwálé',
    role: 'Ẹnjiníà Software',
    location: 'Ìbàdàn, Nigeria',
    phone: '+234 801 234 5678',
    whatsapp: '2348012345678',
    website_url: 'https://olawale.example.com/portfolio/with/a/rather/long/path/that/will/wrap/in/the/text/layer',
    twitter_url: 'https://x.com/olawale',
    skills: Array.from({ length: 30 }, (_, i) => `Skill ${i + 1} ẹ ọ ṣ`),
    skills_grouped: [{ category: 'Ẹ̀kọ́ tools', items: Array.from({ length: 30 }, (_, i) => `Tool ${i + 1} Ọ̀ṣun`) }],
    experience: Array.from({ length: 5 }, (_, n) => ({
      company: `Ilé-iṣẹ́ ${n + 1} Ltd`, role: `Senior engineer ${n + 1}`, period: `${2010 + n * 2} - ${2012 + n * 2}`,
      bullets: Array.from({ length: 12 }, (_, i) => `Bullet ${n}-${i}: shipped a feature for 1,${i}00 users, cut p95 latency by ${i + 10}% and removed a whole class of retries — https://example.com/${n}/${i}/some/long/path`),
    })),
    projects: Array.from({ length: 6 }, (_, i) => ({
      title: `Project ${i + 1} Ṣàngó`, problem: `Problem ${i} ${'x'.repeat(300)}`, solution: `Solution ${i} ẹ`, outcome: `Outcome ${i}: 84% faster`,
      stack: ['Go', 'Postgres', 'Redis'], url: `https://example.com/p/${i}`, github_url: `https://github.com/ola/p${i}`,
    })),
    education: [{ degree: 'BSc Computer Science', institution: 'University of Ìbàdàn', year: '2012', period: '2008 - 2012', grade: 'First class' }],
    certifications: Array.from({ length: 12 }, (_, i) => `Certification ${i + 1} ọ`),
    awards: Array.from({ length: 20 }, (_, i) => ({ title: `Award ${i + 1}`, issuer: `Issuer ${i + 1}`, year: `${2000 + i}`, description: `Description ${i + 1}`, url: `https://example.com/award/${i}` })),
    testimonials: [{ text: 'Great to work with.', author: 'A. Person', role: 'CTO', company: 'Co' }],
  } as PortfolioContent
}

const FIXTURES: Array<[string, PortfolioContent]> = [
  ['engineer sample', SAMPLE_PEOPLE.engineer],
  ['finance sample', SAMPLE_PEOPLE.finance],
  ['clinician sample', SAMPLE_PEOPLE.clinician],
  ['designer sample', SAMPLE_PEOPLE.designer],
  ['sparse', SPARSE],
  ['maximal (caps, Yoruba letters, long addresses)', maximal()],
]

describe.each(FIXTURES)('CV export: %s', (_label, content) => {
  const opts = { includeContact: true, url: 'https://liveportfolio.site/test' }

  it('PDF: every printed item is in the text layer', async () => {
    const { model } = buildCvModel(content, opts)
    const text = squash(await pdfText(await renderPdf(model)))
    const missing = printed(model).filter((s) => !text.includes(squash(s)))
    expect(missing).toEqual([])
  }, 30000)

  it('DOCX: every printed item is in the document', async () => {
    const { model } = buildCvModel(content, opts)
    const { text } = await docxParts(await renderDocx(model))
    const t = squash(text)
    const missing = printed(model).filter((s) => !t.includes(squash(s)))
    expect(missing).toEqual([])
  }, 30000)

  it('everything stored is either printed or reported (nothing drops silently)', () => {
    const { model, report } = buildCvModel(content, opts)
    const shown = squash(printed(model).join(' '))
    const reported = report.omitted.map((o) => `${o.section} ${o.item}`).join(' ')
    const stored = (s: unknown) => (typeof s === 'string' ? s.trim() : '')
    const check = (section: string, value: unknown, max = 100000) => {
      const v = stored(value)
      if (!v) return
      const cut = v.slice(0, max)
      // either the (possibly cut) text is printed, or the section is named in the report
      expect(shown.includes(squash(cut)) || reported.includes(section), `${section}: ${v.slice(0, 40)}`).toBe(true)
    }
    for (const e of content.experience ?? []) for (const b of e.bullets ?? []) check('experience', b, 400)
    for (const p of content.projects ?? []) { check('projects', p.title, 160); check('projects', p.problem, 1500); check('projects', p.solution, 1500); check('projects', p.outcome, 1500) }
    for (const a of (content as { awards?: Array<{ title?: string }> }).awards ?? []) check('awards', a.title, 160)
    for (const c of content.certifications ?? []) check('certifications', c, 160)
    for (const g of content.skills_grouped ?? []) for (const i of g.items ?? []) check('skills', i, 60)
  })

  it('both formats report the same omissions', async () => {
    const a = await exportCv(content, 'pdf', opts)
    const b = await exportCv(content, 'docx', opts)
    expect(a.report).toEqual(b.report)
  }, 30000)

  it('contact details excluded: gone from the text AND from the metadata, and reported', async () => {
    const { model, report } = buildCvModel(content, { ...opts, includeContact: false })
    const secrets = [content.email, content.phone, content.whatsapp].filter(Boolean) as string[]
    const pdf = await renderPdf(model)
    const text = squash(await pdfText(pdf))
    const docx = await docxParts(await renderDocx(model))
    for (const s of secrets) {
      expect(text.includes(squash(s)), `pdf text ${s}`).toBe(false)
      expect(docx.text.includes(s), `docx text ${s}`).toBe(false)
      // metadata and raw bytes: pdf-lib style info strings are visible in the file even when compressed streams are not
      expect(pdf.toString('latin1').includes(s), `pdf bytes ${s}`).toBe(false)
      for (const f of docx.files.filter((n) => n.startsWith('docProps/'))) expect(await docx.zip.file(f)!.async('string'), `${f} ${s}`).not.toContain(s)
    }
    expect(report.contactIncluded).toBe(false)
    for (const kind of [content.email && 'Email', content.phone && 'Phone', content.whatsapp && 'WhatsApp'].filter(Boolean)) {
      expect(report.omitted.some((o) => o.reason === 'contact_excluded' && o.item === kind), String(kind)).toBe(true)
    }
  }, 30000)
})

// ── structure ───────────────────────────────────────────────────────────────────────────────────────────────────────
describe('CV export: ATS-safe structure', () => {
  const opts = { includeContact: true, url: 'https://liveportfolio.site/test' }

  it('DOCX has no table, drawing, text box, image, header or footer; real lists and named styles', async () => {
    const { model } = buildCvModel(maximal(), opts)
    const d = await docxParts(await renderDocx(model))
    for (const bad of ['<w:tbl>', '<w:drawing', '<w:pict', '<w:txbxContent', '<w:sectPr><w:headerReference', 'w:footerReference']) expect(d.xml, bad).not.toContain(bad)
    expect(d.files.some((f) => f.startsWith('word/media/')), 'media').toBe(false)
    expect(d.files.some((f) => /^word\/(header|footer)\d*\.xml$/.test(f)), 'header/footer parts').toBe(false)
    expect(d.xml).toContain('<w:numPr>') // real list items
    expect(d.xml).toContain('w:val="ListBullet"')
    expect(d.xml).toContain('w:val="Heading1"')
    expect(d.xml).toContain('w:val="Heading2"')
    expect(d.xml).toContain('w:val="Title"')
    const styles = await d.zip.file('word/styles.xml')!.async('string')
    expect(styles).toContain('Calibri')
    expect(d.files.some((f) => /fonts\//.test(f)), 'fonts must not be embedded in the Word file').toBe(false)
  }, 30000)

  it('PDF has no embedded image, no annotation-only text and one column (text runs left-aligned at the margin)', async () => {
    const { model } = buildCvModel(maximal(), opts)
    const pdf = await renderPdf(model)
    const raw = pdf.toString('latin1')
    expect(raw).not.toMatch(/\/Subtype\s*\/Image/)
    expect(raw).not.toMatch(/\/Subtype\s*\/Widget/)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise
    expect(doc.numPages).toBeGreaterThan(1) // the maximal fixture spills over: page breaks happen
    const page = await doc.getPage(1)
    const tc = await page.getTextContent()
    const xs = (tc.items as Array<{ str: string; transform: number[] }>).filter((i) => i.str.trim()).map((i) => Math.round(i.transform[4]))
    // one column: every text run starts at the left margin (54) or at the bullet indent (<= 76), never in a right-hand column
    expect(Math.max(...xs)).toBeLessThanOrEqual(80)
  }, 30000)

  it('the section headings are the plain words an applicant tracking system looks for, in order', async () => {
    const { model } = buildCvModel(SAMPLE_PEOPLE.engineer, opts)
    const text = await pdfText(await renderPdf(model))
    const heads = ['Summary', 'Experience', 'Skills', 'Projects', 'Education'].filter((h) => hasSection(model, h.toLowerCase() as never))
    let at = -1
    for (const h of heads) { const i = text.indexOf(h, at + 1); expect(i, h).toBeGreaterThan(at); at = i }
    // experienced people: Experience before Skills
    expect(model.order.indexOf('experience')).toBeLessThan(model.order.indexOf('skills'))
  }, 30000)

  it('someone without experience leads with Education, Projects and Skills', () => {
    const { model } = buildCvModel({ ...SAMPLE_PEOPLE.engineer, experience: [] }, opts)
    expect(model.order.indexOf('education')).toBeLessThan(model.order.indexOf('skills'))
    expect(model.order).not.toContain('experience')
  })

  it('order: experience entries and their bullets keep the stored order', async () => {
    const { model } = buildCvModel(maximal(), opts)
    const text = squash(await pdfText(await renderPdf(model)))
    let at = -1
    for (const e of model.experience) for (const b of e.bullets) { const i = text.indexOf(squash(b), at + 1); expect(i, b.slice(0, 30)).toBeGreaterThan(at); at = i }
  }, 30000)

  it('no empty headings: a section with nothing to print is not drawn', async () => {
    const { model } = buildCvModel({ ...SPARSE, certifications: [], awards: [] } as PortfolioContent, opts)
    const text = await pdfText(await renderPdf(model))
    expect(text).not.toContain('Certifications')
    expect(text).not.toContain('Awards')
  }, 30000)
})

// ── the report ──────────────────────────────────────────────────────────────────────────────────────────────────────
describe('CV export: the report names exactly what is left out', () => {
  const opts = { includeContact: true }
  const base = () => JSON.parse(JSON.stringify(SAMPLE_PEOPLE.engineer)) as PortfolioContent & { awards?: unknown[] }

  it('a complete portfolio reports nothing but the photo and testimonials, which are not CV content by design', () => {
    const { report } = buildCvModel(base(), opts)
    expect(report.omitted.filter((o) => o.reason !== 'not_cv_content')).toEqual([])
  })
  it('over the caps, cut text, invalid links and incomplete entries are each reported with the right reason', () => {
    const c = base()
    c.experience = [{ company: 'Co', role: 'Role', period: '2020', bullets: Array.from({ length: 14 }, (_, i) => (i === 0 ? 'x'.repeat(450) : `b${i}`)) }]
    c.awards = [{ title: 'No issuer', issuer: '', year: '2020' }, ...Array.from({ length: 21 }, (_, i) => ({ title: `A${i}`, issuer: 'I', year: '2020' }))]
    c.certifications = Array.from({ length: 14 }, (_, i) => `Cert ${i}`)
    c.projects = [{ title: 'P', problem: 'p', solution: 's', outcome: 'o', stack: [], url: 'javascript:alert(1)' }]
    c.linkedin_url = 'ftp://nope'
    const r = buildCvModel(c, opts).report.omitted
    const has = (section: string, reason: string) => r.some((o) => o.section === section && o.reason === reason)
    expect(has('experience', 'over_cap')).toBe(true)
    expect(has('experience', 'text_cut')).toBe(true)
    expect(has('awards', 'incomplete_entry')).toBe(true)
    expect(has('awards', 'over_cap')).toBe(true)
    expect(has('certifications', 'over_cap')).toBe(true)
    expect(has('projects', 'link_not_valid')).toBe(true)
    expect(has('links', 'link_not_valid')).toBe(true)
  })
  it('flat skills that the page does not draw (because skill groups exist) are reported, not lost silently', () => {
    const c = base()
    c.skills = ['Go', 'Only-in-flat-list']
    c.skills_grouped = [{ category: 'Languages', items: ['Go'] }]
    expect(buildCvModel(c, opts).report.omitted).toContainEqual({ section: 'skills', item: 'Only-in-flat-list', reason: 'not_shown_on_page' })
  })
  it('only the closed set of reasons is ever used', () => {
    const allowed = new Set(['contact_excluded', 'link_not_valid', 'over_cap', 'incomplete_entry', 'text_cut', 'not_shown_on_page', 'not_cv_content'])
    for (const [, c] of FIXTURES) for (const o of buildCvModel(c, { includeContact: false }).report.omitted) expect(allowed.has(o.reason), o.reason).toBe(true)
  })
})

// ── route, plans, repo rules ────────────────────────────────────────────────────────────────────────────────────────
describe('CV export: access and wiring', () => {
  it('PDF is for every plan, Word is Pro (server-side entitlement)', () => {
    for (const p of ['free', 'basic', 'pro'] as const) expect(entitlementsFor(p).cvPdf, p).toBe(true)
    expect(entitlementsFor('free').cvDocx).toBe(false)
    expect(entitlementsFor('basic').cvDocx).toBe(false)
    expect(entitlementsFor('pro').cvDocx).toBe(true)
  })
  it('the route checks the entitlement itself, requires a signed-in user, and never caches', () => {
    const src = read('app/api/cv/route.ts')
    expect(src).toMatch(/getUserFromRequest\(req\)/)
    expect(src).toMatch(/\.cvPdf/)
    expect(src).toMatch(/\.cvDocx/)
    expect(src).toMatch(/no-store/)
    expect(src).toMatch(/Content-Disposition/)
    expect(src).not.toMatch(/console\.(log|error)\([^)]*content/)
  })
  it('the export is not advertised anywhere yet (rollout step 3 comes after it is verified on production)', () => {
    for (const f of ['lib/plans.ts', 'app/page.tsx', 'components/PricingSection.tsx', 'components/UpgradeModal.tsx', 'lib/email-drip.ts']) {
      const src = read(f)
      if (f === 'lib/plans.ts') expect(src).not.toMatch(/id: 'cv_/)
      else expect(src, f).not.toMatch(/CV export|export (your|a) CV|download (your|a) CV/i)
    }
  })
  it('the file name is lower-case ASCII, whatever the person is called', () => {
    expect(cvFilename('Ọláwálé Ṣẹ́gun Adéwálé', 'pdf')).toBe('olawale-segun-adewale-cv.pdf')
    expect(cvFilename('', 'docx')).toBe('portfolio-cv.docx')
    expect(cvFilename('../../etc/passwd "x"', 'pdf')).toBe('etc-passwd-x-cv.pdf')
  })
  it('the font files and their licence are in the repo', () => {
    for (const f of ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf', 'OFL.txt']) expect(fs.existsSync(path.join(ROOT, 'lib/cv/fonts', f)), f).toBe(true)
  })
  it('the "no resume PDF" rule in CLAUDE.md has been replaced', () => {
    expect(read('CLAUDE.md')).not.toMatch(/^- Resume PDF generation\s*$/m)
  })
})
