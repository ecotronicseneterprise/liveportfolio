import PDFDocument from 'pdfkit'
import { DocModel } from './model'

export type Layout = 'one-column' | 'two-column' | 'photo-header' | 'table-heavy'
export const LAYOUTS: Layout[] = ['one-column', 'two-column', 'photo-header', 'table-heavy']

const PAGE_BOTTOM = 790
const H = (m: DocModel, s: string) => (m.upper ? s.toUpperCase() : s)

class Cursor {
  constructor(public doc: PDFKit.PDFDocument, public x: number, public w: number, public y: number, public top = 40) {}
  text(s: string, o: { size?: number; bold?: boolean; color?: string; gap?: number; x?: number; w?: number } = {}) {
    const d = this.doc
    d.font(o.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(o.size ?? 9.5).fillColor(o.color ?? '#111')
    const w = o.w ?? this.w
    const h = d.heightOfString(s, { width: w })
    if (this.y + h > PAGE_BOTTOM) { d.addPage(); this.y = this.top }
    d.text(s, o.x ?? this.x, this.y, { width: w })
    this.y += h + (o.gap ?? 2)
  }
  heading(s: string, color = '#1a3a5c') {
    this.y += 6
    this.text(s, { size: 11, bold: true, color, gap: 3 })
  }
}

function jobsInto(c: Cursor, m: DocModel) {
  c.heading(H(m, m.jobs.title))
  for (const j of m.jobs.jobs) {
    c.text(`${j.position}, ${j.org}`, { bold: true })
    c.text(j.period, { color: '#555', size: 8.5 })
    j.bullets.forEach((b) => c.text(b, { gap: 1 }))
    c.y += 4
  }
}
function eduInto(c: Cursor, m: DocModel) {
  c.heading(H(m, m.education.title))
  for (const e of m.education.items) {
    c.text(`${e.degree} — ${e.inst}`, { bold: true })
    c.text(`${e.period}${e.score ? ` · ${e.score}` : ''}`, { color: '#555', size: 8.5 })
  }
}
function skillsInto(c: Cursor, m: DocModel) {
  c.heading(H(m, m.skills.title))
  if (m.skills.prose) c.text(m.skills.prose)
  else if (m.skills.inline) c.text(m.skills.groups.flatMap((g) => g.items).join(' | '))
  else for (const g of m.skills.groups) c.text(`${g.name}: ${g.items.join(', ')}`)
}
function projectsInto(c: Cursor, m: DocModel) {
  if (!m.projects) return
  c.heading(H(m, m.projects.title))
  for (const p of m.projects.items) {
    c.text(p.name + (p.url ? ` (${p.url.replace('https://', '')})` : ''), { bold: true })
    c.text(`${p.desc}. Stack: ${p.kw.join(', ')}`)
  }
}
function certsInto(c: Cursor, m: DocModel) {
  if (!m.certs) return
  c.heading(H(m, m.certs.title))
  m.certs.items.forEach((s) => c.text(s))
}
function extrasInto(c: Cursor, m: DocModel) {
  if (m.personal) {
    c.heading(H(m, m.personal.title))
    m.personal.lines.forEach((s) => c.text(s))
  }
  if (m.referees) {
    c.heading(H(m, m.referees.title))
    for (const rf of m.referees.items) {
      c.text(`${rf.name}, ${rf.position}, ${rf.org}`, { bold: true })
      c.text(`${rf.email} | ${rf.phone}`, { size: 8.5, color: '#444' })
    }
  }
}

function oneColumn(doc: PDFKit.PDFDocument, m: DocModel, startY = 40, color = '#111') {
  const c = new Cursor(doc, 45, 505, startY)
  if (startY === 40 && m.preface) c.text(m.preface, { size: 8, color: '#666', gap: 6 })
  if (startY === 40) {
    c.text(m.name, { size: 20, bold: true, gap: 0 })
    c.text(m.label, { size: 11, color: '#1a3a5c' })
    c.text(m.contacts.join('  |  '), { size: 8.5, color: '#444', gap: 4 })
  }
  void color
  if (m.summary) { c.heading(H(m, m.summary.title)); c.text(m.summary.text) }
  jobsInto(c, m); eduInto(c, m); skillsInto(c, m); projectsInto(c, m); certsInto(c, m); extrasInto(c, m)
}

function twoColumn(doc: PDFKit.PDFDocument, m: DocModel) {
  doc.rect(0, 0, 195, 842).fill('#eef2f6')
  const L = new Cursor(doc, 25, 150, 40)
  const R = new Cursor(doc, 220, 335, 40)
  if (m.preface) R.text(m.preface, { size: 8, color: '#666', gap: 6 })
  R.text(m.name, { size: 20, bold: true, gap: 0 })
  R.text(m.label, { size: 11, color: '#1a3a5c', gap: 6 })
  L.heading('CONTACT')
  m.contacts.forEach((s) => L.text(s, { size: 8.5 }))
  skillsInto(L, m); eduInto(L, m); certsInto(L, m); extrasInto(L, m)
  if (m.summary) { R.heading(H(m, m.summary.title)); R.text(m.summary.text) }
  jobsInto(R, m); projectsInto(R, m)
}

function photoHeader(doc: PDFKit.PDFDocument, m: DocModel) {
  doc.rect(0, 0, 595, 120).fill('#16324f')
  doc.circle(80, 60, 34).fill('#e8b04a')
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#16324f').text(m.initials, 56, 49, { width: 48, align: 'center' })
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text(m.name, 135, 30, { width: 420 })
  doc.font('Helvetica').fontSize(11).fillColor('#cfe0f0').text(m.label, 135, 58, { width: 420 })
  doc.fontSize(8.5).fillColor('#ffffff').text(m.contacts.join('   '), 135, 78, { width: 430 })
  if (m.preface) doc.fontSize(7).fillColor('#9fb3c8').text(m.preface, 135, 100, { width: 430 })
  oneColumn(doc, { ...m, preface: undefined }, 140)
}

function tableHeavy(doc: PDFKit.PDFDocument, m: DocModel) {
  const c = new Cursor(doc, 40, 515, 40)
  if (m.preface) c.text(m.preface, { size: 8, color: '#666', gap: 6 })
  c.text(m.name, { size: 20, bold: true, gap: 0 })
  c.text(m.label, { size: 11, color: '#1a3a5c', gap: 4 })
  // contact table: 2 columns x 3 rows
  const cells = m.contacts
  const cw = 257
  for (let i = 0; i < cells.length; i += 2) {
    const y = c.y
    doc.rect(40, y - 2, cw, 16).stroke('#bbb'); doc.rect(40 + cw, y - 2, cw, 16).stroke('#bbb')
    doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(cells[i], 46, y + 2, { width: cw - 10 })
    if (cells[i + 1]) doc.text(cells[i + 1], 46 + cw, y + 2, { width: cw - 10 })
    c.y += 16
  }
  if (m.summary) { c.heading(H(m, m.summary.title)); c.text(m.summary.text) }
  c.heading(H(m, m.jobs.title))
  for (const j of m.jobs.jobs) {
    if (m.mergedCells) {
      // one merged cell (period + role/company) spanning one row per bullet
      const rowH = j.bullets.map((b) => Math.max(doc.heightOfString(b, { width: 277 }), 14) + 8)
      const total = rowH.reduce((a, b) => a + b, 0)
      if (c.y + total > PAGE_BOTTOM) { doc.addPage(); c.y = 40 }
      const y0 = c.y
      doc.rect(40, y0, 230, total).stroke('#bbb')
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111').text(`${j.position}\n${j.org}`, 44, y0 + 4, { width: 222 })
      doc.font('Helvetica').text(j.period, 44, y0 + 30, { width: 222 })
      let yy = y0
      j.bullets.forEach((b, k) => {
        doc.rect(270, yy, 285, rowH[k]).stroke('#bbb')
        doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(b, 274, yy + 4, { width: 277 })
        yy += rowH[k]
      })
      c.y = y0 + total
      continue
    }
    const body = j.bullets.join('\n')
    const h = Math.max(doc.heightOfString(body, { width: 270 }), 30) + 8
    if (c.y + h > PAGE_BOTTOM) { doc.addPage(); c.y = 40 }
    const y = c.y
    doc.rect(40, y, 90, h).stroke('#bbb'); doc.rect(130, y, 140, h).stroke('#bbb'); doc.rect(270, y, 285, h).stroke('#bbb')
    doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(j.period, 44, y + 4, { width: 82 })
    doc.font('Helvetica-Bold').text(`${j.position}\n${j.org}`, 134, y + 4, { width: 132 })
    doc.font('Helvetica').fontSize(8.5).text(body, 274, y + 4, { width: 277 })
    c.y += h
  }
  c.heading(H(m, m.education.title))
  for (const e of m.education.items) {
    const y = c.y
    doc.rect(40, y, 90, 24).stroke('#bbb'); doc.rect(130, y, 425, 24).stroke('#bbb')
    doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(e.period, 44, y + 7, { width: 82 })
    doc.text(`${e.degree} — ${e.inst}${e.score ? ` (${e.score})` : ''}`, 134, y + 7, { width: 417 })
    c.y += 24
  }
  c.heading(H(m, m.skills.title))
  const items = m.skills.groups.flatMap((g) => g.items)
  for (let i = 0; i < items.length; i += 3) {
    const y = c.y
    for (let k = 0; k < 3; k++) {
      doc.rect(40 + k * 172, y, 172, 16).stroke('#bbb')
      if (items[i + k]) doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(items[i + k], 45 + k * 172, y + 4, { width: 162 })
    }
    c.y += 16
  }
  projectsInto(c, m); certsInto(c, m); extrasInto(c, m)
}

export function renderPdf(m: DocModel, layout: Layout): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'Synthetic CV', Author: 'synthetic' } })
    const chunks: Buffer[] = []
    doc.on('data', (d: Buffer) => chunks.push(d))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    let page = 1
    const hf = () => {
      if (m.header) doc.font('Helvetica').fontSize(7.5).fillColor('#777').text(m.header, 45, 14, { width: 505, lineBreak: false })
      if (m.footer) doc.font('Helvetica').fontSize(7.5).fillColor('#777').text(`${m.footer} · ${page}`, 45, 822, { width: 505, lineBreak: false })
    }
    doc.on('pageAdded', () => { page++; hf() })
    hf()
    if (layout === 'one-column') oneColumn(doc, m)
    else if (layout === 'two-column') twoColumn(doc, m)
    else if (layout === 'photo-header') photoHeader(doc, m)
    else tableHeavy(doc, m)
    doc.end()
  })
}
