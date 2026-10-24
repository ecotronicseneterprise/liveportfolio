// Orchestrates the extraction study: each (lib × set × concurrency) in a fresh process, 200 parses each.
//   node pdf-study/run.cjs            (npm run study:pdf)
const { spawnSync } = require('child_process'), path = require('path'), fs = require('fs')
const rows = []
const run = (...a) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'child.cjs'), ...a.map(String)], { encoding: 'utf8', cwd: path.resolve(__dirname, '..') })
  const line = (r.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop()
  if (!line) return { lib: a[0], set: a[1], conc: a[2], crashed: (r.stderr || '').slice(0, 120) }
  return JSON.parse(line)
}
for (const set of ['synthetic', 'real']) for (const lib of ['pdf-parse', 'pdfjs-dist', 'unpdf']) for (const conc of [1, 4, 8]) rows.push(run(lib, set, conc, 200))
// cause analysis for pdf-parse's "bad XRef entry"
const extra = []
extra.push({ test: 'pdf-parse synthetic conc=1, bytes copied into a fresh Buffer', ...run('pdf-parse', 'synthetic', 1, 200, 'copy') })
extra.push({ test: 'pdf-parse synthetic conc=4, bytes copied into a fresh Buffer', ...run('pdf-parse', 'synthetic', 4, 200, 'copy') })
for (const set of ['synthetic', 'real']) for (const conc of [1, 4, 8]) extra.push({ test: `pdf-parse ${set} conc=${conc}, PRODUCTION-LIKE input (Buffer.from(await blob.arrayBuffer()))`, ...run('pdf-parse', set, conc, 200, 'prod') })
let freshFail = 0
const N = 30
for (let i = 0; i < N; i++) { const r = run('pdf-parse', 'synthetic', 1, 1); if (r.fail) freshFail++ }
extra.push({ test: `pdf-parse, ONE parse per fresh process (${N} processes)`, fail: freshFail, parses: N })
fs.mkdirSync(path.join(__dirname, '..', 'results'), { recursive: true })
fs.writeFileSync(path.join(__dirname, '..', 'results', 'pdf-study.json'), JSON.stringify({ rows, extra }, null, 2))
const f = (r) => r.skipped ? `${r.lib.padEnd(11)} ${r.set.padEnd(9)} c=${r.conc}  skipped (${r.skipped})` : r.crashed ? `${r.lib.padEnd(11)} ${r.set.padEnd(9)} c=${r.conc}  CRASHED ${r.crashed}` : `${r.lib.padEnd(11)} ${r.set.padEnd(9)} c=${r.conc}  fail ${String(r.fail).padStart(3)}/${r.parses}  short ${r.short}  ${String(r.perParseMs).padStart(6)} ms/parse  p95 ${String(r.p95Ms).padStart(6)} ms  peak RSS ${r.peakRssMB} MB  ${Object.keys(r.errs).length ? JSON.stringify(r.errs) : ''}`
console.log('Node', process.version, process.platform, process.arch)
rows.forEach((r) => console.log(f(r)))
console.log('--- cause analysis ---')
extra.forEach((r) => console.log(r.test, '=>', r.parses === undefined ? '' : `fail ${r.fail}/${r.parses}`, r.errs ? JSON.stringify(r.errs) : ''))
