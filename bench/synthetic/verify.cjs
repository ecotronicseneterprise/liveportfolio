// Sanity check: every rendered file contains the gold name, email, employers, schools and skills.
process.on("unhandledRejection", (e) => console.log("unhandled:", String(e).slice(0, 80)))
const fs = require('fs'), path = require('path')
const pdf = require('pdf-parse'), mammoth = require('mammoth')
const D = path.join(__dirname, 'out')
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
;(async () => {
  let bad = 0, total = 0, pages = []
  for (const f of fs.readdirSync(path.join(D, "docs")).filter((x) => x.endsWith(process.argv[2]))) {
    const id = f.split('.')[0]

    const g = JSON.parse(fs.readFileSync(path.join(D, 'gold', id + '.json'), 'utf8'))
    const b = fs.readFileSync(path.join(D, 'docs', f))
    let t
    if (f.endsWith('.pdf')) { const r = await Promise.race([pdf(b), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout " + f)), 5000))]); t = r.text; pages.push(r.numpages) } else t = (await mammoth.extractRawText({ buffer: b })).value
    const n = ' ' + norm(t) + ' '
    const need = [g.basics.name, ...g.work.map((w) => w.name), ...g.education.map((e) => e.institution), ...g.skills.flatMap((s) => s.keywords)]
    const miss = need.filter((x) => !n.includes(norm(x)))
    const em = t.includes(g.basics.email)
    total++
    if (miss.length || !em) { bad++; if (bad <= 6) console.log('MISSING', f, miss.slice(0, 3), em ? '' : 'email') }
  }
  console.log({ total, bad, maxPages: Math.max(...pages), avgPages: (pages.reduce((a, b) => a + b, 0) / pages.length).toFixed(2) })
})()
