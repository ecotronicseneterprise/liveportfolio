// One measurement in its own process: node child.cjs <lib> <set> <concurrency> <parses> [copy]
//   lib: pdf-parse | pdfjs-dist | unpdf ; set: synthetic | real ; copy: pass a fresh copy of the bytes
const fs = require('fs'), path = require('path')
const [lib, set, conc, total] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5])]
const mode = process.argv[6] || 'shared' // shared: same Buffer objects reused | copy: fresh copy | prod: Buffer.from(await new Blob([...]).arrayBuffer()) like /api/parse-cv
process.on('unhandledRejection', () => {})

function files() {
  const root = path.resolve(__dirname, '..')
  if (set === 'real') {
    const d = path.join(root, '..', 'fixtures', 'cvs')
    return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(d, f)) : []
  }
  const out = []
  for (const sub of ['docs', path.join('hard', 'docs')]) {
    const d = path.join(root, 'synthetic', 'out', sub)
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.pdf')) out.push(path.join(d, f))
  }
  return out.filter((_, i) => i % 3 === 0) // ~80 distinct synthetic PDFs, cycled to reach `total`
}

async function makeParser() {
  if (lib === 'pdf-parse') { const pdf = require('pdf-parse'); return async (buf) => (await pdf(buf)).text }
  if (lib === 'pdfjs-dist') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    return async (buf) => {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, verbosity: 0 }).promise
      let t = ''
      for (let p = 1; p <= doc.numPages; p++) { const c = await (await doc.getPage(p)).getTextContent(); t += c.items.map((i) => i.str).join(' ') + '\n' }
      await doc.destroy?.()
      return t
    }
  }
  const { extractText } = await import('unpdf')
  return async (buf) => { const r = await extractText(new Uint8Array(buf), { mergePages: true }); return Array.isArray(r.text) ? r.text.join('\n') : r.text }
}

;(async () => {
  const list = files()
  if (!list.length) { console.log(JSON.stringify({ lib, set, conc, skipped: 'no files' })); return }
  const bufs = list.map((f) => fs.readFileSync(f))
  const parse = await makeParser()
  let fail = 0, short = 0, peak = process.memoryUsage().rss, next = 0
  const errs = {}
  const t0 = process.hrtime.bigint()
  const lat = []
  async function worker() {
    while (next < total) {
      const i = next++
      const b = bufs[i % bufs.length]
      const s = process.hrtime.bigint()
      try {
        const arg = mode === 'copy' ? Buffer.from(Uint8Array.from(b)) : mode === 'prod' ? Buffer.from(await new Blob([b]).arrayBuffer()) : b
        const text = await parse(arg)
        if (!text || text.replace(/\s+/g, '').length < 100) short++
      } catch (e) { fail++; const m = String((e && e.message) || e).slice(0, 40); errs[m] = (errs[m] || 0) + 1 }
      lat.push(Number(process.hrtime.bigint() - s) / 1e6)
      peak = Math.max(peak, process.memoryUsage().rss)
    }
  }
  await Promise.all(Array.from({ length: conc }, worker))
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  lat.sort((a, b) => a - b)
  console.log(JSON.stringify({ lib, set, conc, mode, parses: total, files: list.length, fail, short, errs, totalMs: Math.round(ms), perParseMs: +(ms / total).toFixed(1), p95Ms: +lat[Math.floor(lat.length * 0.95)].toFixed(1), peakRssMB: Math.round(peak / 1048576), node: process.version }))
})()
