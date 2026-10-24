// npx tsx bench/synthetic/build.ts   (or: npm run synth:build)
// Writes bench/synthetic/out/{gold/<id>.json, docs/<id>.<layout>.{pdf,docx}}.
// out/ is git-ignored and fully reproducible (seeded), so nothing generated is committed.
import fs from 'node:fs'
import path from 'node:path'
import { buildProfiles } from './profiles'
import { toDocModel } from './model'
import { LAYOUTS, renderPdf } from './render-pdf'
import { renderDocx } from './render-docx'

const OUT = path.join(__dirname, 'out')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'gold'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'docs'), { recursive: true })

async function main() {
  const profiles = buildProfiles()
  let n = 0
  for (const g of profiles) {
    fs.writeFileSync(path.join(OUT, 'gold', `${g.meta.id}.json`), JSON.stringify(g, null, 2))
    const m = toDocModel(g)
    for (const layout of LAYOUTS) {
      fs.writeFileSync(path.join(OUT, 'docs', `${g.meta.id}.${layout}.pdf`), await renderPdf(m, layout))
      fs.writeFileSync(path.join(OUT, 'docs', `${g.meta.id}.${layout}.docx`), await renderDocx(m, layout))
      n += 2
    }
  }
  const v = profiles.reduce<Record<string, number>>((a, p) => ((a[p.meta.variant] = (a[p.meta.variant] || 0) + 1), a), {})
  console.log(`profiles: ${profiles.length} ${JSON.stringify(v)} · files: ${n} (${LAYOUTS.length} layouts × pdf+docx)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
