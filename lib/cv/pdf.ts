// CV as a PDF. ATS-safe by construction: one column, real selectable text in reading order, an embedded ordinary font (Noto Sans, SIL OFL,
// full Latin coverage including ẹ ọ ṣ), no images, no tables, no icons, no text in headers or footers. Server only (reads the font files).
//
// Two details that the first spike found and that must not be "cleaned up":
//  1. The 14 built-in PDF fonts (Helvetica, Times) cannot print Yoruba letters, so the font is embedded.
//  2. pdfkit's layout runs the font's `ccmp` feature, which splits "ẹ" into "e" + a combining dot; pdfkit then maps the plain "e" glyph
//     to "ẹ" in the text layer, so a copied or parsed CV reads "Expẹriẹncẹ". Turning `ccmp` off keeps "ẹ" one glyph and the text exact.
import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import { hasSection, SECTION_TITLE, type CvModel, type CvSection } from './model'

const FONT_DIR = path.join(process.cwd(), 'lib', 'cv', 'fonts')
let fontCache: { regular: Buffer; bold: Buffer } | null = null
function fonts() {
  if (!fontCache) fontCache = { regular: fs.readFileSync(path.join(FONT_DIR, 'NotoSans-Regular.ttf')), bold: fs.readFileSync(path.join(FONT_DIR, 'NotoSans-Bold.ttf')) }
  return fontCache
}

// pdfkit types `features` as a list of features to turn on; fontkit (underneath) also takes the object form, which is what switches one off.
const FEATURES = { ccmp: false } as never

const MARGIN = 54 // 0.75 in
const BODY = 10.5
const GAP = 1.5

export function renderPdf(model: CvModel, size: 'A4' | 'LETTER' = 'A4'): Promise<Buffer> {
  const f = fonts()
  const doc = new PDFDocument({
    size,
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    font: f.regular as unknown as string, // an embedded font, so pdfkit never loads its built-in Helvetica files
    info: {
      Title: `${model.name || 'CV'} - CV`,
      Author: model.name || undefined,
      Subject: model.provenance,
      Creator: 'LivePortfolio',
      Producer: 'LivePortfolio',
    },
    pdfVersion: '1.7',
    lang: 'en',
    tagged: true,
    displayTitle: true,
  })
  doc.registerFont('Regular', f.regular)
  doc.registerFont('Bold', f.bold)

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const W = doc.page.width - MARGIN * 2
  const bottom = () => doc.page.height - doc.page.margins.bottom

  /** Start a new page when the next block (which must not be split) would not fit. */
  const keep = (needed: number) => { if (doc.y + needed > bottom()) doc.addPage() }
  const heightOf = (text: string, width: number, fontName: 'Regular' | 'Bold', size: number) => {
    doc.font(fontName).fontSize(size)
    return doc.heightOfString(text, { width, features: FEATURES, lineGap: GAP })
  }
  const line = (text: string, o: { font?: 'Regular' | 'Bold'; size?: number; after?: number; x?: number; width?: number } = {}) => {
    if (!text) return
    const fontName = o.font ?? 'Regular'
    const size = o.size ?? BODY
    const x = o.x ?? MARGIN
    const width = o.width ?? W
    keep(heightOf(text, width, fontName, size))
    doc.font(fontName).fontSize(size).fillColor('#000000').text(text, x, doc.y, { width, features: FEATURES, lineGap: GAP })
    if (o.after) doc.y += o.after
  }
  const bullet = (text: string) => {
    const indent = 14
    const h = heightOf(text, W - indent, 'Regular', BODY)
    keep(h)
    const y = doc.y
    doc.font('Regular').fontSize(BODY).fillColor('#000000')
    doc.text('•', MARGIN + 2, y, { lineBreak: false, features: FEATURES })
    doc.text(text, MARGIN + indent, y, { width: W - indent, features: FEATURES, lineGap: GAP })
    doc.y += 1.5
  }
  const heading = (title: string) => {
    keep(60) // a heading is never the last thing on a page
    doc.y += 8
    doc.font('Bold').fontSize(12).fillColor('#000000').text(title, MARGIN, doc.y, { width: W, features: FEATURES })
    const y = doc.y + 1
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.6).strokeColor('#000000').stroke()
    doc.y = y + 5
  }

  // ── header ──
  if (model.name) line(model.name, { font: 'Bold', size: 20, after: 2 })
  for (const t of model.title) line(t, { size: 11.5, after: 1 })
  if (model.contactLine.length) line(model.contactLine.join('  |  '), { after: 1 })
  for (const l of model.links) line(l, { after: 0 })

  // ── sections ──
  const draw: Record<CvSection, () => void> = {
    summary: () => { for (const p of model.summary) line(p, { after: 4 }) },
    experience: () => {
      for (const e of model.experience) {
        const head = [e.role, e.company].filter(Boolean).join(', ')
        keep(heightOf(head, W, 'Bold', BODY) + (e.period ? 14 : 0) + (e.bullets[0] ? heightOf(e.bullets[0], W - 14, 'Regular', BODY) : 0))
        line(head, { font: 'Bold', after: 0 })
        if (e.period) line(e.period, { after: 2 })
        for (const b of e.bullets) bullet(b)
        doc.y += 5
      }
    },
    skills: () => {
      for (const g of model.skills) {
        const text = g.category ? `${g.category}: ${g.items.join(', ')}` : g.items.join(', ')
        line(text, { after: 2 })
      }
    },
    projects: () => {
      for (const p of model.projects) {
        keep(heightOf(p.title, W, 'Bold', BODY) + 28)
        line(p.title, { font: 'Bold', after: 0 })
        if (p.stack.length) line(`Stack: ${p.stack.join(', ')}`, { after: 1 })
        if (p.problem) bullet(`Problem: ${p.problem}`)
        if (p.solution) bullet(`Solution: ${p.solution}`)
        if (p.outcome) bullet(`Outcome: ${p.outcome}`)
        if (p.url) line(`Link: ${p.url}`, { after: 0 })
        if (p.sourceUrl) line(`Source: ${p.sourceUrl}`, { after: 0 })
        doc.y += 5
      }
    },
    education: () => { for (const e of model.education) line(e, { after: 2 }) },
    certifications: () => { for (const c of model.certifications) bullet(c) },
    awards: () => {
      for (const a of model.awards) {
        line([a.title, a.issuer, a.year].filter(Boolean).join(', '), { font: 'Bold', after: 0 })
        if (a.description) line(a.description, { after: 0 })
        if (a.url) line(`Link: ${a.url}`, { after: 0 })
        doc.y += 4
      }
    },
  }
  for (const k of model.order) {
    if (!hasSection(model, k)) continue
    heading(SECTION_TITLE[k])
    draw[k]()
  }

  doc.end()
  return done
}
