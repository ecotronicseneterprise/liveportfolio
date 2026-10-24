// Model comparison on the HARD set (dev 30% / test 70%, split by profile). Real OpenAI calls.
//   MODELS_STAGE=dev  npm run bench:models-hard     → 1 run of every config on the dev profiles
//   MODELS_STAGE=test MODELS_CONFIGS=a,b npm run bench:models-hard   → N runs (default 3) on the test profiles
//   MODELS_STAGE=estimate                            → prints the cost estimate only (no calls)
// Needs bench/.env.local with a DEDICATED project key. Same extracted text is fed to every model
// (extracted once per doc), so differences are the model's, not the extractor's.
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './lib/env'
const haveKey = loadEnv() && !!process.env.OPENAI_API_KEY
import { als, CallRecord, costOf, installSpy } from './lib/llm-spy'
import { importText, detectKind, extractText } from '../lib/connectors/document'
import { addScores, bootstrap, emptyScores, FAMILIES, norm, overall, prf, scoreDraft, Scores } from './lib/score'
import type { Gold } from './synthetic/profiles'
import { buildHard } from './synthetic/build-hard'

export interface Config { id: string; model: string; effort: string | null; pinned: boolean }
export const CONFIGS: Config[] = [
  { id: 'luna-none', model: 'gpt-6-luna', effort: 'none', pinned: false },
  { id: 'luna-low', model: 'gpt-6-luna', effort: 'low', pinned: false },
  { id: '5.4-mini-none', model: 'gpt-5.4-mini', effort: 'none', pinned: true }, // dated snapshot gpt-5.4-mini-2026-03-17 exists
  { id: 'terra-none', model: 'gpt-5.6-terra', effort: 'none', pinned: false },
  { id: 'sol-low', model: 'gpt-6.1-sol', effort: 'low', pinned: false },
  { id: '4o-mini', model: 'gpt-4o-mini', effort: null, pinned: true }, // gpt-4o-mini-2024-07-18
]

const STAGE = process.env.MODELS_STAGE || 'dev'
const RUNS = Number(process.env.MODELS_RUNS || (STAGE === 'test' ? 3 : 1))
const CONC = Number(process.env.MODELS_CONCURRENCY || 6)
const OUT = path.join(__dirname, 'synthetic', 'out', 'hard')
const RES = path.join(__dirname, 'results')

interface Doc { id: string; layout: string; ext: 'pdf' | 'docx'; gold: Gold; text: string }
async function loadDocs(split: 'dev' | 'test'): Promise<Doc[]> {
  if (!fs.existsSync(path.join(OUT, 'gold'))) await buildHard()
  const docs: Doc[] = []
  for (const f of fs.readdirSync(path.join(OUT, 'gold')).sort()) {
    const gold = JSON.parse(fs.readFileSync(path.join(OUT, 'gold', f), 'utf8')) as Gold
    if (gold.meta.split !== split) continue
    const file = `${gold.meta.id}.${gold.meta.layout}.${gold.meta.ext}`
    const buf = fs.readFileSync(path.join(OUT, 'docs', file))
    let text = ''
    for (let i = 0; i < 6 && !text; i++) {
      try { text = await extractText(buf, detectKind(buf)!) } catch { await new Promise((r) => setTimeout(r, 50)) }
    }
    docs.push({ id: gold.meta.id, layout: gold.meta.layout!, ext: gold.meta.ext!, gold, text })
  }
  return docs
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]) } }))
  return out
}

export interface Row { cfg: string; doc: string; layout: string; ext: string; run: number; ms: number; calls: CallRecord[]; scores?: Scores; items?: string[]; error?: string; schemaFail: boolean }

async function runOne(cfg: Config, d: Doc, run: number): Promise<Row> {
  const ctx = { calls: [] as CallRecord[], config: { model: cfg.model, effort: cfg.effort } }
  const t0 = Date.now()
  const base = { cfg: cfg.id, doc: d.id, layout: d.layout, ext: d.ext, run }
  try {
    const out = await als.run(ctx, () => importText(d.text))
    const p = out.profile
    const items = [
      ...(p.skills ?? []), ...(p.experience ?? []).map((e) => e.company), ...(p.education ?? []).map((e) => e.institution),
      ...(p.projects ?? []).map((x) => x.title), ...(p.certifications ?? []),
    ].map(norm)
    return { ...base, ms: Date.now() - t0, calls: ctx.calls, scores: scoreDraft(p, d.gold, d.text), items, schemaFail: false }
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'error'
    return { ...base, ms: Date.now() - t0, calls: ctx.calls, error: code, schemaFail: code === 'parse_failed' }
  }
}

const q = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0 }
const pct = (x: number, d = 1) => (x * 100).toFixed(d)
const jac = (a: string[], b: string[]) => { const A = new Set(a), B = new Set(b); const i = [...A].filter((x) => B.has(x)).length; const u = new Set([...A, ...B]).size; return u ? i / u : 1 }

export interface Summary { cfg: Config; n: number; f1: number; f1ci: [number, number]; recall: number; recallCi: [number, number]; hall: number; hallCi: [number, number]; schemaFails: number; errors: number; agreement: number | null; p50: number; p95: number; tokIn: number; tokOut: number; tokReason: number; tokCached: number; cost: number; returned: string[]; minFamilyRecall: [string, number] }

export function summarise(cfg: Config, rows: Row[]): Summary {
  const ok = rows.filter((r) => r.scores)
  const agg = emptyScores()
  ok.forEach((r) => addScores(agg, r.scores!))
  const o = prf(overall(agg))
  const ci = bootstrap(ok.map((r) => r.scores!))
  const calls = ok.flatMap((r) => r.calls)
  const perDoc = (f: (c: CallRecord) => number) => ok.length ? calls.reduce((a, c) => a + f(c), 0) / ok.length : 0
  const byDoc = new Map<string, Row[]>()
  ok.forEach((r) => byDoc.set(r.doc, [...(byDoc.get(r.doc) ?? []), r]))
  const agreements: number[] = []
  for (const rs of byDoc.values()) for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) agreements.push(jac(rs[i].items!, rs[j].items!))
  const fam = FAMILIES.map((f) => [f, prf(agg[f]).r] as [string, number]).sort((a, b) => a[1] - b[1])[0]
  return {
    cfg, n: ok.length, f1: o.f1, f1ci: ci.f1, recall: o.r, recallCi: ci.recall,
    hall: agg.hall.n ? agg.hall.bad / agg.hall.n : 0, hallCi: ci.hall,
    schemaFails: rows.filter((r) => r.schemaFail).length, errors: rows.filter((r) => r.error).length,
    agreement: agreements.length ? agreements.reduce((a, b) => a + b, 0) / agreements.length : null,
    p50: q(ok.map((r) => r.ms), 0.5), p95: q(ok.map((r) => r.ms), 0.95),
    tokIn: perDoc((c) => c.prompt), tokOut: perDoc((c) => c.completion - c.reasoning), tokReason: perDoc((c) => c.reasoning), tokCached: perDoc((c) => c.cached),
    cost: ok.length ? calls.reduce((a, c) => a + costOf(cfg.model, c), 0) / ok.length : 0,
    returned: [...new Set(calls.map((c) => c.returnedModel))], minFamilyRecall: fam,
  }
}

export function table(s: Summary[]): string {
  const h = 'config          | n   | F1 [95% CI]          | recall [CI]          | halluc % [CI]    | schema fail | err | agree | p50 s | p95 s | tok in/out/reason/cached | $/CV     | returned model id'
  const lines = s.map((x) => [
    x.cfg.id.padEnd(15), String(x.n).padStart(3),
    `${pct(x.f1)} [${pct(x.f1ci[0])}-${pct(x.f1ci[1])}]`.padEnd(20),
    `${pct(x.recall)} [${pct(x.recallCi[0])}-${pct(x.recallCi[1])}]`.padEnd(20),
    `${pct(x.hall, 2)} [${pct(x.hallCi[0], 2)}-${pct(x.hallCi[1], 2)}]`.padEnd(16),
    String(x.schemaFails).padStart(11), String(x.errors).padStart(3),
    (x.agreement === null ? 'n/a' : pct(x.agreement)).padStart(5),
    (x.p50 / 1000).toFixed(1).padStart(5), (x.p95 / 1000).toFixed(1).padStart(5),
    `${Math.round(x.tokIn)}/${Math.round(x.tokOut)}/${Math.round(x.tokReason)}/${Math.round(x.tokCached)}`.padEnd(24),
    `$${x.cost.toFixed(5)}`.padEnd(8), x.returned.join(','),
  ].join(' | '))
  return [h, ...lines].join('\n')
}

/** The user's decision rule. */
export function passes(s: Summary): { ok: boolean; why: string[] } {
  const why: string[] = []
  if (s.recall < 0.95) why.push(`recall ${pct(s.recall)} < 95`)
  if (s.hall > 0.02) why.push(`halluc ${pct(s.hall, 2)} > 2`)
  if (s.schemaFails > 0) why.push(`${s.schemaFails} schema failures`)
  if (s.agreement !== null && s.agreement < 0.95) why.push(`agreement ${pct(s.agreement)} < 95`)
  if (s.p95 > 10000) why.push(`p95 ${(s.p95 / 1000).toFixed(1)}s > 10`)
  return { ok: why.length === 0, why }
}

export async function main() {
  const estimateOnly = STAGE === 'estimate'
  if (!haveKey && !estimateOnly) throw new Error('bench/.env.local with OPENAI_API_KEY (dedicated project key) is required. Nothing was called.')
  const split = STAGE === 'test' ? 'test' : 'dev'
  const docs = await loadDocs(split)
  const wanted = (process.env.MODELS_CONFIGS || (STAGE === 'test' ? '' : CONFIGS.map((c) => c.id).join(','))).split(',').filter(Boolean)
  const cfgs = CONFIGS.filter((c) => wanted.includes(c.id))
  if (!cfgs.length) throw new Error('set MODELS_CONFIGS=id,id (ids: ' + CONFIGS.map((c) => c.id).join(', ') + ')')
  console.log(`stage=${STAGE} split=${split} docs=${docs.length} runs=${RUNS} configs=${cfgs.map((c) => c.id).join(',')} calls=${docs.length * RUNS * cfgs.length}`)
  if (estimateOnly) return

  installSpy()
  fs.mkdirSync(RES, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const all = new Map<string, Row[]>()
  let spent = 0
  for (const cfg of cfgs) {
    const jobs = docs.flatMap((d) => Array.from({ length: RUNS }, (_, r) => ({ d, r })))
    const rows = await pool(jobs, CONC, ({ d, r }) => runOne(cfg, d, r))
    all.set(cfg.id, rows)
    const cost = rows.flatMap((r) => r.calls).reduce((a, c) => a + costOf(cfg.model, c), 0)
    spent += cost
    console.log(`done ${cfg.id}: ${rows.filter((r) => r.error).length} errors / ${rows.length}; spend $${cost.toFixed(3)} (running total $${spent.toFixed(3)})`)
    fs.writeFileSync(path.join(RES, `models-hard-${STAGE}-${cfg.id}-${stamp}.json`), JSON.stringify(rows))
  }

  const sums = cfgs.map((c) => summarise(c, all.get(c.id)!))
  const out: string[] = ['', `##### ${STAGE.toUpperCase()} set — ${docs.length} profiles × ${RUNS} run(s) #####`, table(sums), '', 'Decision rule (recall ≥ 95, halluc ≤ 2, 0 schema failures, agreement ≥ 95, p95 ≤ 10 s):']
  for (const s of sums) { const p = passes(s); out.push(`  ${s.cfg.id.padEnd(15)} ${p.ok ? 'PASS' : 'fail: ' + p.why.join('; ')}${s.cfg.pinned ? '   [pinned snapshot exists]' : '   [alias only — not pinned]'}   weakest family recall: ${s.minFamilyRecall[0]} ${pct(s.minFamilyRecall[1])}`) }

  out.push('', 'F1 [95% CI] by layout × format:')
  const cells = [...new Set(docs.map((d) => `${d.layout} ${d.ext}`))].sort()
  out.push('cell'.padEnd(24) + sums.map((s) => s.cfg.id.padStart(22)).join(''))
  for (const cell of cells) {
    out.push(cell.padEnd(24) + sums.map((s) => {
      const rs = all.get(s.cfg.id)!.filter((r) => r.scores && `${r.layout} ${r.ext}` === cell)
      if (!rs.length) return 'n/a'.padStart(22)
      const a = emptyScores(); rs.forEach((r) => addScores(a, r.scores!))
      const ci = bootstrap(rs.map((r) => r.scores!), 400)
      return `${pct(prf(overall(a)).f1)} [${pct(ci.f1[0], 0)}-${pct(ci.f1[1], 0)}] n=${new Set(rs.map((r) => r.doc)).size}`.padStart(22)
    }).join(''))
  }
  const tags = [...new Set(docs.flatMap((d) => d.gold.meta.tags!))].sort()
  out.push('', 'F1 by hard-mode tag (docs carrying the tag):')
  out.push('tag'.padEnd(20) + sums.map((s) => s.cfg.id.padStart(14)).join(''))
  for (const tag of tags) {
    const ids = new Set(docs.filter((d) => d.gold.meta.tags!.includes(tag)).map((d) => d.id))
    if (ids.size < 3) continue
    out.push(`${tag} (${ids.size})`.padEnd(20) + sums.map((s) => {
      const rs = all.get(s.cfg.id)!.filter((r) => r.scores && ids.has(r.doc))
      const a = emptyScores(); rs.forEach((r) => addScores(a, r.scores!))
      return pct(prf(overall(a)).f1).padStart(14)
    }).join(''))
  }
  const inj = sums.map((s) => { const rs = all.get(s.cfg.id)!.filter((r) => r.scores?.injection.attempted); return `${s.cfg.id}: hijacked ${rs.filter((r) => r.scores!.injection.hijacked).length}/${rs.length}` })
  const leak = sums.map((s) => { const rs = all.get(s.cfg.id)!.filter((r) => r.scores && r.scores.refereeLeak !== undefined && (r.doc && docs.find((d) => d.id === r.doc)!.gold.referees?.length)); return `${s.cfg.id}: ${rs.filter((r) => r.scores!.refereeLeak).length}/${rs.length}` })
  out.push('', 'Injection (attacker email / "Quantum Hacking" in output): ' + inj.join(' · '), 'Referee leakage (referee email/org taken as the candidate\'s): ' + leak.join(' · '), `Total spend this stage: $${spent.toFixed(3)}`)
  const text = out.join('\n')
  fs.writeFileSync(path.join(RES, `models-hard-${STAGE}-summary-${stamp}.txt`), text)
  console.log(text)
}
