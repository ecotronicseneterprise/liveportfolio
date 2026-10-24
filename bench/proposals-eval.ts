// Evaluation of the three PROPOSALS (email selection, URL de-wrap, phone patterns). No network, no API.
//   npm run proposals
import fs from 'node:fs'
import path from 'node:path'
import mammoth from 'mammoth'
import { getExampleNumber, CountryCode } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { layoutText } from './lib/layout-pdf'
import { norm } from './lib/score'
import type { Gold } from './synthetic/profiles'
import { selectEmail } from './proposals/email-select'
import { dewrapUrls } from './proposals/dewrap'
import { currentPhones, libPhones, proposedPhones, Hit } from './proposals/phone'

const OUT = path.join(__dirname, 'synthetic', 'out')
const LAYOUTS = ['one-column', 'two-column', 'photo-header', 'table-heavy']

interface Doc { id: string; gold: Gold; text: string; set: string; layout: string; ext: string }

async function textOf(file: string): Promise<string> {
  const buf = fs.readFileSync(file)
  return file.endsWith('.pdf') ? layoutText(buf) : (await mammoth.extractRawText({ buffer: buf })).value
}

async function docs(): Promise<Doc[]> {
  const out: Doc[] = []
  const easy = fs.readdirSync(path.join(OUT, 'gold')).sort()
  for (const [i, f] of easy.entries()) {
    const gold = JSON.parse(fs.readFileSync(path.join(OUT, 'gold', f), 'utf8')) as Gold
    const layout = LAYOUTS[i % 4], ext = Math.floor(i / 4) % 2 === 0 ? 'pdf' : 'docx'
    out.push({ id: gold.meta.id, gold, text: await textOf(path.join(OUT, 'docs', `${gold.meta.id}.${layout}.${ext}`)), set: 'easy', layout, ext })
  }
  const hardDir = path.join(OUT, 'hard')
  if (fs.existsSync(hardDir)) {
    for (const f of fs.readdirSync(path.join(hardDir, 'gold')).sort()) {
      const gold = JSON.parse(fs.readFileSync(path.join(hardDir, 'gold', f), 'utf8')) as Gold
      out.push({ id: gold.meta.id, gold, text: await textOf(path.join(hardDir, 'docs', `${gold.meta.id}.${gold.meta.layout}.${gold.meta.ext}`)), set: 'hard', layout: gold.meta.layout!, ext: gold.meta.ext! })
    }
  }
  return out
}

const LI = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+/i
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const cover = (hits: Hit[], at: number, len: number) => hits.some((h) => Math.min(h.end, at + len) - Math.max(h.start, at) >= 0.9 * len)

async function main() {
  const all = await docs()
  console.log(`documents: ${all.length} (${all.filter((d) => d.set === 'easy').length} easy + ${all.filter((d) => d.set === 'hard').length} hard)\n`)

  // ── 1. email selection ────────────────────────────────────────────────────
  const row = (label: string, f: (d: Doc) => string | null) => {
    const sets: Record<string, { ok: number; n: number }> = {}
    const bad: string[] = []
    for (const d of all) {
      const want = d.gold.basics.email.toLowerCase()
      const got = (f(d) ?? '').toLowerCase()
      const cell = (sets[d.set] ??= { ok: 0, n: 0 }); cell.n++
      if (got === want) cell.ok++
      else bad.push(`${d.id}(${d.gold.meta.variant}${d.gold.referees?.length ? ',referees' : ''})`)
    }
    console.log(`${label.padEnd(34)} easy ${sets.easy.ok}/${sets.easy.n}   hard ${sets.hard?.ok ?? 0}/${sets.hard?.n ?? 0}   wrong: ${bad.slice(0, 8).join(' ') || 'none'}`)
  }
  console.log('=== 1. email selection (correct = equals the candidate\'s gold email) ===')
  row('current: first email in text', (d) => d.text.match(EMAIL)?.[0] ?? null)
  row('proposal: scored selection', (d) => selectEmail(d.text, { name: d.gold.basics.name }).email)
  row('proposal, name unknown', (d) => selectEmail(d.text).email)
  const amb = all.filter((d) => selectEmail(d.text, { name: d.gold.basics.name }).ambiguous)
  const multi = all.filter((d) => new Set(d.text.match(new RegExp(EMAIL.source, 'g'))?.map((e) => e.toLowerCase())).size > 1)
  console.log(`docs with >1 distinct email: ${multi.length}; flagged ambiguous by the proposal: ${amb.length}; ambiguous AND wrong: ${amb.filter((d) => (selectEmail(d.text, { name: d.gold.basics.name }).email ?? '').toLowerCase() !== d.gold.basics.email.toLowerCase()).length}`)
  const inj = all.filter((d) => d.gold.meta.variant === 'injection-early')
  console.log(`injection-early docs: current hijacked ${inj.filter((d) => /evil\.example/.test(d.text.match(EMAIL)?.[0] ?? '')).length}/${inj.length}, proposal hijacked ${inj.filter((d) => /evil\.example/.test(selectEmail(d.text, { name: d.gold.basics.name }).email ?? '')).length}/${inj.length}`)
  const ref = all.filter((d) => d.gold.referees?.length)
  console.log(`docs with referees: current takes a referee email ${ref.filter((d) => d.gold.referees!.some((r) => (d.text.match(EMAIL)?.[0] ?? '').toLowerCase() === r.email.toLowerCase())).length}/${ref.length}, proposal ${ref.filter((d) => d.gold.referees!.some((r) => (selectEmail(d.text, { name: d.gold.basics.name }).email ?? '').toLowerCase() === r.email.toLowerCase())).length}/${ref.length}`)

  // ── 2. LinkedIn de-wrap ───────────────────────────────────────────────────
  console.log('\n=== 2. LinkedIn URL capture (captured handle == gold handle) ===')
  const pdfs = all.filter((d) => d.ext === 'pdf')
  const okLi = (t: string, d: Doc) => (t.match(LI)?.[0] ?? '').toLowerCase().endsWith(d.gold.basics.profiles[1].username.toLowerCase())
  console.log(`PDFs: current ${pdfs.filter((d) => okLi(d.text, d)).length}/${pdfs.length}   with de-wrap ${pdfs.filter((d) => okLi(dewrapUrls(d.text), d)).length}/${pdfs.length}`)
  const docx = all.filter((d) => d.ext === 'docx')
  console.log(`DOCX: current ${docx.filter((d) => okLi(d.text, d)).length}/${docx.length}   with de-wrap ${docx.filter((d) => okLi(dewrapUrls(d.text), d)).length}/${docx.length}`)
  const prose = 'A state-\nof-the-art system with cross-\nplatform support and well-\nknown clients.'
  console.log(`prose with trailing hyphens untouched: ${dewrapUrls(prose) === prose}`)
  const gh = (t: string, d: Doc) => (t.match(/github\.com\/[A-Za-z0-9-]+/i)?.[0] ?? '').toLowerCase().endsWith(d.gold.basics.profiles[0].username.toLowerCase())
  console.log(`GitHub handle captured: current ${all.filter((d) => gh(d.text, d)).length}/${all.length}  with de-wrap ${all.filter((d) => gh(dewrapUrls(d.text), d)).length}/${all.length}`)

  // ── 3. phones ─────────────────────────────────────────────────────────────
  console.log('\n=== 3. phone patterns on an INDEPENDENT list (formats generated by libphonenumber-js, not by me) ===')
  const countries = ['NG', 'GH', 'KE', 'ZA', 'GB', 'US', 'CA', 'DE', 'FR', 'IN', 'SG', 'AE', 'EG', 'ET', 'BR', 'AU'] as CountryCode[]
  type Case = { country: string; label: string; s: string }
  const cases: Case[] = []
  for (const c of countries) {
    const p = getExampleNumber(c, examples)
    if (!p) continue
    const intl = p.formatInternational(), nat = p.formatNational(), e164 = p.number
    const variants: Array<[string, string]> = [
      ['international', intl], ['national', nat], ['E.164', e164],
      ['intl dashes', intl.replace(/ /g, '-')], ['intl dots', intl.replace(/ /g, '.')],
      ['national dashes', nat.replace(/[ ()]+/g, '-').replace(/^-|-$/g, '')], ['national no spaces', nat.replace(/[ ()-]/g, '')],
    ]
    for (const [label, s] of variants) cases.push({ country: c, label, s })
  }
  const NG_EXTRA: Case[] = [
    { country: 'NG*', label: '(0803) 555-0142  [named in the brief]', s: '(0803) 555-0142' },
    { country: 'NG*', label: '+234 (0) 803 555 0142  [named in the brief]', s: '+234 (0) 803 555 0142' },
    { country: 'NG*', label: '0803.555.0142', s: '0803.555.0142' },
    { country: 'NG*', label: '+234-(0)803-555-0142', s: '+234-(0)803-555-0142' },
  ]
  const engines: Array<[string, (t: string, country: string) => Hit[]]> = [
    ['current RegexEngine', (t) => currentPhones(t)], ['proposed patterns', (t) => proposedPhones(t)],
    ['libphonenumber-js (country given)', (t, c) => libPhones(t, (c === 'NG*' ? 'NG' : c) as 'NG')],
  ]
  const run = (cs: Case[], eng: (t: string, country: string) => Hit[]) => {
    let ok = 0
    const miss: string[] = []
    for (const c of cs) {
      const text = `Mobile: ${c.s}, email x@y.com`
      const at = text.indexOf(c.s)
      if (cover(eng(text, c.country), at, c.s.length)) ok++
      else miss.push(`${c.country} ${c.label.split('  ')[0]}`)
    }
    return { ok, n: cs.length, miss }
  }
  const plus = cases.filter((c) => c.s.startsWith('+'))
  const ngNational = cases.filter((c) => c.country === 'NG' && !c.s.startsWith('+'))
  const otherNational = cases.filter((c) => c.country !== 'NG' && !c.s.startsWith('+'))
  console.log(`cases: ${plus.length} with a + prefix (16 countries), ${ngNational.length} Nigerian national, ${otherNational.length} other-country national (need a default country), ${NG_EXTRA.length} extra Nigerian formats`)
  for (const [name, eng] of engines) {
    const a = run(plus, eng), b = run(ngNational, eng), c = run(otherNational, eng), d = run(NG_EXTRA, eng)
    console.log(`${name.padEnd(36)} "+" formats ${a.ok}/${a.n} | NG national ${b.ok}/${b.n} | other-country national ${c.ok}/${c.n} | NG extra ${d.ok}/${d.n}`)
    if (a.miss.length) console.log(`${''.padEnd(36)} missed "+": ${a.miss.slice(0, 6).join(' ; ')}${a.miss.length > 6 ? ` …(+${a.miss.length - 6})` : ''}`)
    if (d.miss.length) console.log(`${''.padEnd(36)} missed NG extra: ${d.miss.join(' ; ')}`)
  }

  const NOT_PHONES = [
    'Jan 2019 – Mar 2021', '2019 - 2022', '03/04/2019 – 11/2021', '12 May 2021', 'GPA 3.75/5.00', '98.5% accuracy', 'v3.11.4', 'ISO 27001:2013', 'Order #20260101123', 'Ref no 12345678901 filed',
    'PIN 123456', '1,200 users and 10,000+ MAU', '$1,000,000 in revenue', 'Level 2 – 2019', 'Grew from 20000 to 450000 users', 'Project 2023-2024', 'RFC 7231', 'Postcode SW1A 1AA', 'Room 2024', 'NYSC call-up 2019/2020',
    'ID 20240101 12345', 'Served 450 000 customers in 12 months', 'Reduced costs by 1234567', 'Born 12-03-1995', 'Phase 1 – 2 – 3 delivered', 'Zip 90210-1234 office', 'Lat 6.5244, Long 3.3792', 'Page 1 of 2', '2021-03-15', 'NIN: 12345678901',
  ]
  console.log('\nfalse positives on 30 numeric non-phone strings (lower is better):')
  for (const [name, eng] of engines) {
    const fp = NOT_PHONES.filter((s) => eng(`Detail: ${s} end`, 'NG').length > 0)
    console.log(`${name.padEnd(32)} ${fp.length}/30   ${fp.slice(0, 6).join(' | ')}`)
  }
  const t0 = performance.now(); for (let i = 0; i < 200; i++) libPhones(all[i % all.length].text, 'NG'); const lib = (performance.now() - t0) / 200
  const t1 = performance.now(); for (let i = 0; i < 200; i++) proposedPhones(all[i % all.length].text); const rx = (performance.now() - t1) / 200
  console.log(`\nspeed per CV text: libphonenumber-js ${lib.toFixed(2)} ms, proposed regex ${rx.toFixed(3)} ms; libphonenumber-js on-disk 12 MB (bundle: min metadata ≈ 80 kB)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
