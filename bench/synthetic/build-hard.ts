// npm run synth:hard — writes bench/synthetic/out/hard/{gold,docs}/ (one file per profile, in its assigned layout/format).
import fs from 'node:fs'
import path from 'node:path'
import { buildHardProfiles } from './hard'
import { toDocModel } from './model'
import { renderPdf } from './render-pdf'
import { renderDocx } from './render-docx'

const OUT = path.join(__dirname, 'out', 'hard')

export async function buildHard(count = 100) {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'gold'), { recursive: true })
  fs.mkdirSync(path.join(OUT, 'docs'), { recursive: true })
  const profiles = buildHardProfiles(count)
  for (const g of profiles) {
    fs.writeFileSync(path.join(OUT, 'gold', `${g.meta.id}.json`), JSON.stringify(g, null, 2))
    const m = toDocModel(g)
    const layout = g.meta.layout as 'one-column' | 'two-column' | 'photo-header' | 'table-heavy'
    const buf = g.meta.ext === 'pdf' ? await renderPdf(m, layout) : await renderDocx(m, layout)
    fs.writeFileSync(path.join(OUT, 'docs', `${g.meta.id}.${layout}.${g.meta.ext}`), buf)
  }
  return profiles
}

if (require.main === module) {
  buildHard().then((p) => {
    const split = p.reduce<Record<string, number>>((a, g) => ((a[g.meta.split!] = (a[g.meta.split!] || 0) + 1), a), {})
    const tags = p.reduce<Record<string, number>>((a, g) => (g.meta.tags!.forEach((t) => (a[t] = (a[t] || 0) + 1)), a), {})
    console.log('hard profiles:', p.length, JSON.stringify(split))
    console.log('tags:', JSON.stringify(tags))
  }).catch((e) => { console.error(e); process.exit(1) })
}
