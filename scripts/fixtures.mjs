#!/usr/bin/env node
// Field-level regression check for /api/parse-cv.
//
//   node scripts/fixtures.mjs snapshot   → POST every file in fixtures/cvs, write fixtures/baseline/<name>.json
//   node scripts/fixtures.mjs diff       → re-run and compare against the baseline, field by field
//
// Workflow (baseline MUST be taken on the code you want to compare against, i.e. main):
//   1. git checkout main && npm run dev        (local server, a NON-production OPENAI_API_KEY)
//   2. npm run fixtures:snapshot
//   3. git checkout feat/import-connectors && npm run dev
//   4. npm run fixtures:diff
//
// Safety: refuses any base URL that isn't localhost unless ALLOW_REMOTE=1, so it can't be
// pointed at production by accident. Each request carries a distinct x-forwarded-for so the
// endpoint's 3-per-IP-per-hour limiter doesn't trip (local only).

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CV_DIR = path.join(ROOT, 'fixtures', 'cvs')
const BASE_DIR = path.join(ROOT, 'fixtures', 'baseline')
const BASE_URL = process.env.FIXTURE_BASE_URL || 'http://localhost:3000'
const ENDPOINT = `${BASE_URL}/api/parse-cv`
const MIME = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

// Keys the legacy endpoint returned. Anything else in a new response is reported as "added".
const LEGACY_SCALARS = ['name', 'role', 'email', 'location', 'bio', 'github_url', 'linkedin_url']
const LEGACY_LISTS = ['skills', 'projects', 'experience']

function guardTarget() {
  const host = new URL(BASE_URL).hostname
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.ALLOW_REMOTE !== '1') {
    console.error(`Refusing to run against ${host}. Fixtures must hit a local server (set ALLOW_REMOTE=1 to override).`)
    process.exit(2)
  }
}

async function listCvs() {
  if (!existsSync(CV_DIR)) return []
  return (await readdir(CV_DIR)).filter((f) => MIME[path.extname(f).toLowerCase()]).sort()
}

async function parse(file, i) {
  const buf = await readFile(path.join(CV_DIR, file))
  const fd = new FormData()
  fd.append('file', new File([buf], file, { type: MIME[path.extname(file).toLowerCase()] }))
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: fd,
    headers: { 'x-forwarded-for': `10.250.${Math.floor(i / 250)}.${(i % 250) + 1}` },
  })
  let body = null
  try { body = await res.json() } catch { /* non-JSON */ }
  return { status: res.status, body }
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

function listItemKey(field, item) {
  if (typeof item === 'string') return norm(item)
  if (field === 'projects') return norm(item.title)
  if (field === 'experience') return norm(`${item.company}|${item.role}`)
  return norm(JSON.stringify(item))
}

function compare(before, after) {
  const out = []
  for (const f of LEGACY_SCALARS) {
    const a = before?.[f] ?? null
    const b = after?.[f] ?? null
    if (norm(a) === norm(b)) continue
    if (isEmpty(a)) out.push({ kind: 'added', field: f, detail: String(b) })
    else if (isEmpty(b)) out.push({ kind: 'LOST', field: f, detail: `was "${a}"` })
    else out.push({ kind: 'changed', field: f, detail: `"${a}" → "${b}"` })
  }
  for (const f of LEGACY_LISTS) {
    const a = before?.[f] ?? []
    const b = after?.[f] ?? []
    const ka = new Set(a.map((x) => listItemKey(f, x)))
    const kb = new Set(b.map((x) => listItemKey(f, x)))
    const lost = [...ka].filter((k) => !kb.has(k))
    const gained = [...kb].filter((k) => !ka.has(k))
    if (a.length !== b.length || lost.length || gained.length) {
      const kind = b.length < a.length ? 'LOST' : 'changed'
      out.push({ kind, field: f, detail: `${a.length} → ${b.length}${lost.length ? `; missing: ${lost.slice(0, 3).join(', ')}` : ''}${gained.length ? `; new: ${gained.slice(0, 3).join(', ')}` : ''}` })
    }
  }
  for (const f of Object.keys(after ?? {})) {
    if (LEGACY_SCALARS.includes(f) || LEGACY_LISTS.includes(f)) continue
    if (!isEmpty(after[f])) out.push({ kind: 'added', field: f, detail: Array.isArray(after[f]) ? `${after[f].length} item(s)` : String(after[f]) })
  }
  return out
}

async function snapshot() {
  const files = await listCvs()
  if (!files.length) return console.error('No CVs in fixtures/cvs (add .pdf/.docx files first).') || process.exit(1)
  await mkdir(BASE_DIR, { recursive: true })
  for (const [i, f] of files.entries()) {
    const r = await parse(f, i)
    await writeFile(path.join(BASE_DIR, `${f}.json`), JSON.stringify(r, null, 2))
    console.log(`${r.status === 200 ? 'ok ' : 'ERR'} ${f} (HTTP ${r.status})`)
  }
  console.log(`\nBaseline written to fixtures/baseline for ${files.length} file(s).`)
}

async function diff() {
  const files = await listCvs()
  if (!files.length) return console.error('No CVs in fixtures/cvs.') || process.exit(1)
  let lost = 0, changed = 0, added = 0, missingBaseline = 0
  for (const [i, f] of files.entries()) {
    const basePath = path.join(BASE_DIR, `${f}.json`)
    if (!existsSync(basePath)) { console.log(`?  ${f}: no baseline (run snapshot on main first)`); missingBaseline++; continue }
    const before = JSON.parse(await readFile(basePath, 'utf8'))
    const after = await parse(f, i)
    console.log(`\n${f}  (HTTP ${before.status} → ${after.status})`)
    if (before.status === 200 && after.status !== 200) {
      console.log(`  LOST  whole parse: ${after.body?.error ?? 'unknown'} — ${after.body?.message ?? ''}`)
      lost++
      continue
    }
    const diffs = compare(before.body, after.body)
    if (!diffs.length) console.log('  identical on legacy fields')
    for (const d of diffs) {
      console.log(`  ${d.kind.padEnd(7)} ${d.field}: ${d.detail}`)
      if (d.kind === 'LOST') lost++
      else if (d.kind === 'changed') changed++
      else added++
    }
  }
  console.log(`\nSummary: ${lost} lost, ${changed} changed, ${added} added, ${missingBaseline} without baseline.`)
  console.log('Note: wording of LLM-written fields (bio, descriptions) varies run to run; judge "changed" by eye, treat LOST as regressions.')
  if (lost) process.exitCode = 1
}

guardTarget()
const cmd = process.argv[2]
if (cmd === 'snapshot') await snapshot()
else if (cmd === 'diff') await diff()
else { console.error('Usage: node scripts/fixtures.mjs <snapshot|diff>'); process.exit(2) }
