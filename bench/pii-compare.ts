// RegexEngine (ours) vs OpenRedaction (npm, MIT) as a PiiEngine, on the synthetic set.
//   npx tsx bench/pii-compare.ts
// No network, no API key. Prints aggregates and counts only.
import fs from 'node:fs'
import path from 'node:path'
import { OpenRedaction } from 'openredaction'
import { RegexEngine } from '../lib/llm/pii/regex-engine'
import type { PiiEngine, PiiEntity, PiiSpan } from '../lib/llm/pii/types'
import { toDocModel, DocModel } from './synthetic/model'
import type { Gold } from './synthetic/profiles'

/** Adapter: OpenRedaction → PiiEngine. Only the five entities we redact are mapped; the rest are ignored. */
export class OpenRedactionEngine implements PiiEngine {
  readonly name = 'openredaction'
  private shield = new OpenRedaction()
  async detect(text: string): Promise<PiiSpan[]> {
    const res = await this.shield.detect(text)
    const out: PiiSpan[] = []
    for (const d of res.detections as Array<{ type: string; position: [number, number]; confidence?: number }>) {
      const entity = mapType(d.type)
      if (entity) out.push({ entity, start: d.position[0], end: d.position[1], score: d.confidence ?? 0.8 })
    }
    return out
  }
  async detectAll(text: string) {
    const res = await this.shield.detect(text)
    return res.detections as Array<{ type: string; position: [number, number] }>
  }
}
function mapType(t: string): PiiEntity | null {
  if (/EMAIL/i.test(t)) return 'EMAIL'
  if (/PHONE|MOBILE|TELEPHONE/i.test(t)) return 'PHONE'
  if (/URL|LINKEDIN|GITHUB|WEBSITE|SOCIAL|HANDLE/i.test(t)) return 'URL'
  if (/NIN|BVN|NATIONAL_ID|PASSPORT|SSN|TAX_ID|TIN\b/i.test(t)) return 'ID'
  if (/CARD|CREDIT|PAN/i.test(t)) return 'CARD'
  return null
}

// The same text a PDF extractor would see, as a flat string. Reserved example.* domains are swapped for
// gmail/yahoo so OpenRedaction's test-domain suppression doesn't turn the comparison into an artefact.
const MAIL = ['gmail.com', 'yahoo.com', 'outlook.com']
const fixMail = (s: string, i: number) => s.replace(/@example\.(com|org|net)/g, `@${MAIL[i % 3]}`)

function textOf(m: DocModel): string {
  return [
    m.preface ?? '', m.name, m.label, m.contacts.join(' | '), m.summary?.text ?? '',
    ...m.jobs.jobs.flatMap((j) => [`${j.position}, ${j.org}`, j.period, ...j.bullets]),
    ...m.education.items.map((e) => `${e.degree} — ${e.inst} ${e.period} ${e.score ?? ''}`),
    m.skills.groups.flatMap((g) => g.items).join(', '),
    ...(m.projects?.items.map((p) => `${p.name} ${p.url ?? ''} ${p.desc}. Stack: ${p.kw.join(', ')}`) ?? []),
    ...(m.certs?.items ?? []),
    ...(m.personal?.lines ?? []),
  ].join('\n')
}

type Gp = { entity: PiiEntity; value: string }
function goldPii(g: Gold, m: DocModel, i: number): Gp[] {
  const out: Gp[] = [
    { entity: 'EMAIL', value: fixMail(g.basics.email, i) },
    { entity: 'PHONE', value: g.basics.phone },
    ...m.contacts.filter((c) => /github\.com|linkedin\.com/.test(c)).map((c) => ({ entity: 'URL' as const, value: c })),
    ...g.projects.filter((p) => p.url).map((p) => ({ entity: 'URL' as const, value: p.url!.replace('https://', '') })),
  ]
  if (g.meta.injectedEmail) out.push({ entity: 'EMAIL', value: g.meta.injectedEmail })
  if (g.meta.nin) out.push({ entity: 'ID', value: g.meta.nin })
  return out
}
function goldNonPii(g: Gold): Array<{ cat: string; value: string }> {
  return [
    ...g.work.map((w) => ({ cat: 'employers', value: w.name })),
    ...g.work.map((w) => ({ cat: 'job titles', value: w.position })),
    ...g.education.map((e) => ({ cat: 'schools', value: e.institution })),
    ...g.skills.flatMap((s) => s.keywords.map((k) => ({ cat: 'skills', value: k }))),
    ...g.projects.map((p) => ({ cat: 'projects', value: p.name })),
    ...g.certificates.map((c) => ({ cat: 'certs', value: c.name })),
    { cat: 'cities', value: g.basics.location.city },
  ]
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

const NG_PHONES = ['0803 555 0142', '08035550142', '+234 803 555 0142', '+2348035550142', '234 803 555 0142', '(0803) 555-0142', '0803-555-0142', '+234 (0) 803 555 0142', '+234-803-555-0142', '0703 555 0142', '0903 555 0142', '+234 810 555 0142']
const INTL_PHONES = ['+1 202 555 0143', '+44 20 7946 0123', '(202) 555-0143', '+49 30 12345678', '+233 24 555 0143', '+254 712 345678']
const ID_CASES: Array<[string, boolean]> = [
  ['NIN: 12345678901', true], ['BVN 22212345678', true], ['National Identity Number: 1234 5678 901', true],
  ['Ref no 12345678901 filed', false], ['Invoice 20260101123', false],
]

async function main() {
  const dir = path.join(__dirname, 'synthetic', 'out', 'gold')
  const golds = fs.readdirSync(dir).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Gold)
  const rx = new RegexEngine()
  const t0 = performance.now()
  const or = new OpenRedactionEngine()
  const loadMs = performance.now() - t0
  const engines: Array<[string, (t: string) => Promise<PiiSpan[]>]> = [
    ['RegexEngine (ours)', async (t) => rx.detect(t)],
    ['OpenRedaction (mapped)', (t) => or.detect(t)],
  ]

  console.log(`profiles: ${golds.length}`)
  for (const [name, detect] of engines) {
    const rec: Record<string, { n: number; any: number; typed: number; touch: number }> = {}
    const fp: Record<string, { n: number; hit: number }> = {}
    let ms = 0
    for (const [i, g] of golds.entries()) {
      const m = toDocModel(g)
      const text = fixMail(textOf(m), i)
      const s = performance.now()
      const spans = await detect(text)
      ms += performance.now() - s
      for (const p of goldPii(g, m, i)) {
        const at = text.indexOf(p.value)
        const r = (rec[p.entity] ??= { n: 0, any: 0, typed: 0, touch: 0 })
        r.n++
        if (at < 0) continue
        if (spans.some((s2) => overlap(s2.start, s2.end, at, at + p.value.length) > 0)) r.touch++
        const cover = spans.filter((s2) => overlap(s2.start, s2.end, at, at + p.value.length) >= 0.6 * p.value.length)
        if (cover.length) r.any++
        if (cover.some((s2) => s2.entity === p.entity)) r.typed++
      }
      for (const np of goldNonPii(g)) {
        const at = text.indexOf(np.value)
        const f = (fp[np.cat] ??= { n: 0, hit: 0 })
        f.n++
        if (at >= 0 && spans.some((s2) => overlap(s2.start, s2.end, at, at + np.value.length) > 0)) f.hit++
      }
    }
    console.log(`\n=== ${name} — synthetic profiles ===`)
    console.log('recall (right type, ≥60% of the string covered):')
    for (const [e, r] of Object.entries(rec)) console.log(`  ${e.padEnd(6)} ${r.typed}/${r.n} = ${((100 * r.typed) / r.n).toFixed(1)}%   (any span ≥60% covered: ${((100 * r.any) / r.n).toFixed(1)}%, partially touched: ${((100 * r.touch) / r.n).toFixed(1)}%)`)
    console.log('false positives (non-PII strings overlapped by a detection):')
    for (const [c, f] of Object.entries(fp)) console.log(`  ${c.padEnd(11)} ${f.hit}/${f.n} = ${((100 * f.hit) / f.n).toFixed(1)}%`)
    console.log(`  speed: ${(ms / golds.length).toFixed(2)} ms per CV text`)

    const ng = await Promise.all(NG_PHONES.map(async (p) => {
      const t = `Phone: ${p} email x@y.com`
      const s = await detect(t); const at = t.indexOf(p)
      const cov = s.filter((x) => x.entity === 'PHONE' && overlap(x.start, x.end, at, at + p.length) >= 0.9 * p.length)
      return cov.length > 0
    }))
    const intl = await Promise.all(INTL_PHONES.map(async (p) => {
      const t = `Phone: ${p} email x@y.com`
      const s = await detect(t); const at = t.indexOf(p)
      return s.some((x) => x.entity === 'PHONE' && overlap(x.start, x.end, at, at + p.length) >= 0.9 * p.length)
    }))
    const ids = await Promise.all(ID_CASES.map(async ([t, should]) => {
      const s = await detect(t)
      return s.some((x) => x.entity === 'ID') === should
    }))
    console.log(`  Nigerian phone formats fully covered: ${ng.filter(Boolean).length}/${NG_PHONES.length}   [missed: ${NG_PHONES.filter((_, i) => !ng[i]).join(' ; ') || 'none'}]`)
    console.log(`  international phone formats fully covered: ${intl.filter(Boolean).length}/${INTL_PHONES.length}`)
    console.log(`  NIN/BVN cases correct (flag with context, ignore without): ${ids.filter(Boolean).length}/${ID_CASES.length}`)
  }

  // What would OpenRedaction redact if used unrestricted (all 571 patterns)?
  const all: Record<string, number> = {}
  let total = 0
  for (const [i, g] of golds.entries()) {
    const text = fixMail(textOf(toDocModel(g)), i)
    for (const d of await or.detectAll(text)) { all[d.type] = (all[d.type] ?? 0) + 1; total++ }
  }
  const top = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}:${v}`).join(', ')
  console.log(`\nOpenRedaction UNRESTRICTED on the synthetic CVs: ${total} detections across ${golds.length} CVs (${(total / golds.length).toFixed(1)}/CV). Top types: ${top}`)
  console.log(`OpenRedaction load/construct: ${loadMs.toFixed(0)} ms`)
}
main().catch((e) => { console.error(e); process.exit(1) })
