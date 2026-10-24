// Pipeline-variant comparison on the synthetic gold set. Calls the real OpenAI API.
// Run through vitest (bench/variants.bench.ts): under tsx, `import('pdf-parse')` has no module.parent,
// which triggers pdf-parse@1's debug branch and corrupts later parses ("bad XRef entry").
//   npm run bench:variants
//   BENCH_MODELS=gpt-4o-mini,gpt-6-luna BENCH_VARIANTS=a,b,c BENCH_DOCS=44 BENCH_CONCURRENCY=6 npm run bench:variants
// Prints aggregates only. Raw per-doc results go to bench/results/ (git-ignored).
import fs from 'node:fs'
import path from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'
import { loadEnv } from './lib/env'
loadEnv()
import { setUsageObserver } from '../lib/llm/call'
import { run, stats, VARIANT_NAMES, VariantId } from './lib/variants'
import { addScores, emptyScores, FAMILIES, overall, prf, scoreDraft, Scores } from './lib/score'
import type { Gold } from './synthetic/profiles'
import { LAYOUTS } from './synthetic/render-pdf'

const PRICE: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-6-luna': { in: 0.1, out: 0.5 },
}
const MODELS = (process.env.BENCH_MODELS || 'gpt-4o-mini,gpt-6-luna').split(',')
const VARIANTS = (process.env.BENCH_VARIANTS || 'a,b,c').split(',') as VariantId[]
const NDOCS = Number(process.env.BENCH_DOCS || 44)
const CONC = Number(process.env.BENCH_CONCURRENCY || 6)
const OUT = path.join(__dirname, 'synthetic', 'out')

type Usage = { prompt: number; completion: number; calls: number }
const als = new AsyncLocalStorage<Usage>()
setUsageObserver((u) => {
  const s = als.getStore()
  if (s) { s.prompt += u.promptTokens; s.completion += u.completionTokens; s.calls++ }
})

interface Doc { id: string; layout: string; ext: 'pdf' | 'docx'; gold: Gold; buffer: Buffer }
function docs(): Doc[] {
  const ids = fs.readdirSync(path.join(OUT, 'gold')).map((f) => f.replace('.json', '')).sort().slice(0, NDOCS)
  return ids.map((id, i) => {
    const layout = LAYOUTS[i % 4]
    const ext = Math.floor(i / 4) % 2 === 0 ? 'pdf' : 'docx'
    return {
      id, layout, ext,
      gold: JSON.parse(fs.readFileSync(path.join(OUT, 'gold', `${id}.json`), 'utf8')) as Gold,
      buffer: fs.readFileSync(path.join(OUT, 'docs', `${id}.${layout}.${ext}`)),
    }
  })
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]) }
  }))
  return out
}

const q = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))] ?? 0 }
const pct = (x: number) => (x * 100).toFixed(1)

interface Row { id: string; layout: string; ext: string; ms: number; prompt: number; completion: number; calls: number; scores?: Scores; error?: string }

export async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
  if (!fs.existsSync(path.join(OUT, 'gold'))) throw new Error('run: npm run synth:build')
  const all = docs()
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true })
  const summary: string[] = []
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  for (const model of MODELS) {
    process.env.LLM_MODEL = model
    process.env.LLM_REASONING_EFFORT = 'none'
    summary.push(`\n##### ${model}  (docs=${all.length}, concurrency=${CONC}) #####`)
    const rowsByVariant = new Map<VariantId, Row[]>()
    for (const v of VARIANTS) {
      const set = v === 'b' ? all.filter((d) => d.ext === 'pdf') : all
      const rows = await pool(set, CONC, async (d): Promise<Row> => {
        const u: Usage = { prompt: 0, completion: 0, calls: 0 }
        const t0 = Date.now()
        try {
          const profile = await als.run(u, () => run(v, { buffer: d.buffer, ext: d.ext }))
          return { id: d.id, layout: d.layout, ext: d.ext, ms: Date.now() - t0, ...u, scores: scoreDraft(profile, d.gold) }
        } catch (e) {
          return { id: d.id, layout: d.layout, ext: d.ext, ms: Date.now() - t0, ...u, error: (e as { code?: string; message?: string }).code || (e as Error).message }
        }
      })
      rowsByVariant.set(v, rows)
      fs.writeFileSync(path.join(__dirname, 'results', `variants-${model}-${v}-${stamp}.json`), JSON.stringify(rows))
      console.log(`done ${model} variant ${v}: ${rows.filter((r) => r.error).length} errors / ${rows.length}`)
    }

    const pr = PRICE[model]
    const line = (label: string, rows: Row[]) => {
      const ok = rows.filter((r) => r.scores)
      const agg = emptyScores()
      ok.forEach((r) => addScores(agg, r.scores!))
      const o = prf(overall(agg))
      const ms = ok.map((r) => r.ms)
      const cost = ok.map((r) => (pr ? (r.prompt * pr.in + r.completion * pr.out) / 1e6 : NaN))
      const tok = ok.map((r) => r.prompt + r.completion)
      const inj = ok.filter((r) => r.scores!.injection.attempted)
      const hij = inj.filter((r) => r.scores!.injection.hijacked).length
      return `${label.padEnd(34)}| n=${String(ok.length).padStart(2)} err=${rows.length - ok.length} | P ${pct(o.p)} R ${pct(o.r)} F1 ${pct(o.f1)} | p50 ${q(ms, 0.5)}ms p95 ${q(ms, 0.95)}ms | tok ${Math.round(tok.reduce((a, b) => a + b, 0) / (tok.length || 1))} | $${(cost.reduce((a, b) => a + b, 0) / (cost.length || 1)).toFixed(5)} | injection hijacked ${hij}/${inj.length}`
    }
    summary.push('variant                           | docs        | micro P/R/F1 (all fields)    | latency (wall, conc ' + CONC + ')  | tokens/CV | $/CV    | injection')
    for (const v of VARIANTS) summary.push(line(`${v}: ${VARIANT_NAMES[v]}`, rowsByVariant.get(v)!))
    const aPdf = rowsByVariant.get('a')?.filter((r) => r.ext === 'pdf')
    if (aPdf && VARIANTS.includes('b')) summary.push(line('a (PDF-only subset, for b vs a)', aPdf))

    summary.push('\nF1 by field family (per variant):')
    summary.push(`${''.padEnd(10)}${VARIANTS.map((v) => v.padStart(7)).join('')}`)
    for (const f of FAMILIES) {
      summary.push(f.padEnd(10) + VARIANTS.map((v) => {
        const agg = emptyScores()
        rowsByVariant.get(v)!.filter((r) => r.scores).forEach((r) => addScores(agg, r.scores!))
        return pct(prf(agg[f]).f1).padStart(7)
      }).join(''))
    }
    summary.push('\nOverall F1 by layout × format (PDF only where noted):')
    summary.push(`${''.padEnd(24)}${VARIANTS.map((v) => v.padStart(7)).join('')}`)
    for (const layout of LAYOUTS) for (const ext of ['pdf', 'docx']) {
      summary.push(`${layout} ${ext}`.padEnd(24) + VARIANTS.map((v) => {
        const rows = rowsByVariant.get(v)!.filter((r) => r.scores && r.layout === layout && r.ext === ext)
        if (!rows.length) return '    n/a'.padStart(7)
        const agg = emptyScores()
        rows.forEach((r) => addScores(agg, r.scores!))
        return pct(prf(overall(agg)).f1).padStart(7)
      }).join(''))
    }
    const errs = VARIANTS.flatMap((v) => rowsByVariant.get(v)!.filter((r) => r.error).map((r) => `${v}/${r.id}:${r.error}`))
    if (errs.length) summary.push(`\nerrors: ${errs.slice(0, 10).join(', ')}`)
  }
  summary.push('', `pdf-parse flakiness: ${stats.pdfParseRetries} retries over ${stats.pdfParseCalls} PDF parses`)
  const text = summary.join('\n')
  fs.writeFileSync(path.join(__dirname, 'results', `variants-summary-${stamp}.txt`), text)
  console.log(text)
}
