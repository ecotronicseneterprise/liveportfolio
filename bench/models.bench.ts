// Compares models on fixtures/cvs through the real import pipeline (importDocument → callLLM).
// Prints ONLY aggregate numbers — never CV text or extracted values.
//
//   npm run bench:models                       default: gpt-4o-mini vs gpt-6-luna (effort none), 3 runs each
//   BENCH_MODELS=a,b BENCH_RUNS=2 npm run bench:models
//
// Needs OPENAI_API_KEY (use a throwaway project key). Results are NOT ground truth: there are no
// labelled answers, so quality is judged by (a) groundedness — does each extracted skill/employer/
// school actually occur in the source text, (b) completeness counts, (c) run-to-run and
// cross-model agreement.

import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { importDocument, extractText, detectKind } from '../lib/connectors/document'
import { setUsageObserver } from '../lib/llm/call'
import type { ImportDraft } from '../lib/connectors/types'
import { loadEnv } from './lib/env'

loadEnv()

// USD per 1M tokens (OpenAI model pages; re-check before relying on them)
const PRICE: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-6-luna': { in: 0.1, out: 0.5 },
}

const MODELS = (process.env.BENCH_MODELS || 'gpt-4o-mini,gpt-6-luna').split(',').map((s) => s.trim())
const RUNS = Number(process.env.BENCH_RUNS || 3)
const DIR = path.resolve(__dirname, '..', 'fixtures', 'cvs')

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 100)
const p = (xs: number[], q: number) => {
  const a = [...xs].sort((x, y) => x - y)
  return a[Math.min(a.length - 1, Math.floor(q * a.length))]
}
const jaccard = (a: Set<string>, b: Set<string>) => {
  const inter = [...a].filter((x) => b.has(x)).length
  const uni = new Set([...a, ...b]).size
  return uni ? inter / uni : 1
}

function shape(d: Partial<ImportDraft>, source: string) {
  const src = ` ${key(source)} `
  const grounded = (items: string[]) => items.filter((i) => src.includes(` ${key(i)} `) || src.includes(key(i))).length
  const skills = d.skills ?? []
  const companies = (d.experience ?? []).map((e) => e.company).filter(Boolean)
  const schools = (d.education ?? []).map((e) => e.institution).filter(Boolean)
  return {
    counts: {
      skills: skills.length,
      certs: (d.certifications ?? []).length,
      projects: (d.projects ?? []).length,
      jobs: (d.experience ?? []).length,
      bullets: (d.experience ?? []).reduce((n, e) => n + e.bullets.length, 0),
      edu: (d.education ?? []).length,
      bioChars: (d.bio ?? '').length,
    },
    grounded: { skills: [grounded(skills), skills.length], companies: [grounded(companies), companies.length], schools: [grounded(schools), schools.length] },
    sets: { skills: new Set(skills.map(key)), companies: new Set(companies.map(key)), schools: new Set(schools.map(key)) },
  }
}

type Shape = ReturnType<typeof shape>

describe('model comparison', () => {
  it('runs', async () => {
    const files = fs.readdirSync(DIR).filter((f) => /\.(pdf|docx)$/i.test(f)).sort()
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
    if (!files.length) throw new Error('no fixtures')

    const sources = new Map<string, string>()
    for (const f of files) {
      const buf = fs.readFileSync(path.join(DIR, f))
      sources.set(f, await extractText(buf, detectKind(buf)!))
    }

    type Row = { ms: number[]; cost: number[]; tokens: number[]; shapes: Shape[]; fail: number }
    const res = new Map<string, Row>() // `${model}|${file}`
    let current = { prompt: 0, completion: 0 }
    setUsageObserver((u) => { current = { prompt: u.promptTokens, completion: u.completionTokens } })

    for (const model of MODELS) {
      process.env.LLM_MODEL = model
      process.env.LLM_REASONING_EFFORT = 'none'
      for (const [i, f] of files.entries()) {
        const row: Row = { ms: [], cost: [], tokens: [], shapes: [], fail: 0 }
        for (let r = 0; r < RUNS; r++) {
          current = { prompt: 0, completion: 0 }
          const t0 = Date.now()
          try {
            const out = await importDocument({ buffer: fs.readFileSync(path.join(DIR, f)) })
            row.ms.push(Date.now() - t0)
            const pr = PRICE[model]
            row.cost.push(pr ? (current.prompt * pr.in + current.completion * pr.out) / 1e6 : NaN)
            row.tokens.push(current.prompt + current.completion)
            row.shapes.push(shape(out.profile, sources.get(f)!))
          } catch (e) {
            row.fail++
            console.log(`  ! ${model} CV${i + 1} run ${r + 1} failed: ${(e as { code?: string }).code ?? 'error'}`)
          }
        }
        res.set(`${model}|${f}`, row)
      }
    }

    const lines: string[] = ['', `RUNS=${RUNS} effort=none (GPT-6 family)`, '']
    for (const model of MODELS) {
      lines.push(`=== ${model} ===`)
      lines.push('CV  | p50 ms | p95 ms | tokens | $/CV     | fails | skills jobs bullets edu cert proj bio | grounded% skills/cos/schools | run-agree skills/cos')
      let allMs: number[] = []
      let allCost: number[] = []
      files.forEach((f, i) => {
        const r = res.get(`${model}|${f}`)!
        allMs = allMs.concat(r.ms)
        allCost = allCost.concat(r.cost)
        const s = r.shapes[0]
        if (!s) { lines.push(`CV${i + 1} | all runs failed`); return }
        const g = (x: number[]) => `${pct(x[0], x[1])}`
        const agree = (k: 'skills' | 'companies') =>
          r.shapes.length > 1 ? Math.round(100 * (r.shapes.slice(1).reduce((a, sh) => a + jaccard(r.shapes[0].sets[k], sh.sets[k]), 0) / (r.shapes.length - 1))) : 100
        const c = s.counts
        lines.push(
          `CV${i + 1} | ${p(r.ms, 0.5)} | ${p(r.ms, 0.95)} | ${Math.round(r.tokens.reduce((a, b) => a + b, 0) / r.tokens.length)} | $${(r.cost.reduce((a, b) => a + b, 0) / r.cost.length).toFixed(5)} | ${r.fail} | ${c.skills} ${c.jobs} ${c.bullets} ${c.edu} ${c.certs} ${c.projects} ${c.bioChars} | ${g(s.grounded.skills)}/${g(s.grounded.companies)}/${g(s.grounded.schools)} | ${agree('skills')}/${agree('companies')}`
        )
      })
      lines.push(`ALL | p50 ${p(allMs, 0.5)}ms p95 ${p(allMs, 0.95)}ms | mean $${(allCost.reduce((a, b) => a + b, 0) / (allCost.length || 1)).toFixed(5)} per CV`, '')
    }

    if (MODELS.length === 2) {
      const [A, B] = MODELS
      lines.push(`=== cross-model agreement (${A} vs ${B}, run 1) — Jaccard % ===`, 'CV  | skills | employers | schools')
      files.forEach((f, i) => {
        const a = res.get(`${A}|${f}`)!.shapes[0]
        const b = res.get(`${B}|${f}`)!.shapes[0]
        if (!a || !b) return
        lines.push(`CV${i + 1} | ${Math.round(100 * jaccard(a.sets.skills, b.sets.skills))} | ${Math.round(100 * jaccard(a.sets.companies, b.sets.companies))} | ${Math.round(100 * jaccard(a.sets.schools, b.sets.schools))}`)
      })
    }
    const out = lines.join('\n')
    fs.writeFileSync(path.resolve(__dirname, 'results', 'models-latest.txt'), out)
    console.log(out)
  })
})
