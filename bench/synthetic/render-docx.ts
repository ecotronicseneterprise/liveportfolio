import {
  AlignmentType, BorderStyle, Document, Footer, Header, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalMergeType, WidthType,
} from 'docx'
import { DocModel } from './model'
import type { Layout } from './render-pdf'

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const H = (m: DocModel, s: string) => (m.upper ? s.toUpperCase() : s)

const p = (text: string, o: { bold?: boolean; size?: number; color?: string; before?: number } = {}) =>
  new Paragraph({
    spacing: { before: o.before ?? 0, after: 40 },
    children: [new TextRun({ text, bold: o.bold, size: (o.size ?? 10) * 2, color: o.color })],
  })
const h = (m: DocModel, text: string) => p(H(m, text), { bold: true, size: 12, color: '1A3A5C', before: 160 })

function sectionParas(m: DocModel, which: Array<'summary' | 'jobs' | 'edu' | 'skills' | 'projects' | 'certs' | 'personal'>): Paragraph[] {
  const out: Paragraph[] = []
  for (const w of which) {
    if (w === 'summary' && m.summary) out.push(h(m, m.summary.title), p(m.summary.text))
    if (w === 'jobs') {
      out.push(h(m, m.jobs.title))
      for (const j of m.jobs.jobs) {
        out.push(p(`${j.position}, ${j.org}`, { bold: true }), p(j.period, { size: 9, color: '555555' }), ...j.bullets.map((b) => p(b)))
      }
    }
    if (w === 'edu') {
      out.push(h(m, m.education.title))
      for (const e of m.education.items) out.push(p(`${e.degree} — ${e.inst}`, { bold: true }), p(`${e.period}${e.score ? ` · ${e.score}` : ''}`, { size: 9, color: '555555' }))
    }
    if (w === 'skills') {
      out.push(h(m, m.skills.title))
      if (m.skills.prose) out.push(p(m.skills.prose))
      else if (m.skills.inline) out.push(p(m.skills.groups.flatMap((g) => g.items).join(' | ')))
      else m.skills.groups.forEach((g) => out.push(p(`${g.name}: ${g.items.join(', ')}`)))
    }
    if (w === 'projects' && m.projects) {
      out.push(h(m, m.projects.title))
      for (const pr of m.projects.items) out.push(p(pr.name + (pr.url ? ` (${pr.url.replace('https://', '')})` : ''), { bold: true }), p(`${pr.desc}. Stack: ${pr.kw.join(', ')}`))
    }
    if (w === 'certs' && m.certs) out.push(h(m, m.certs.title), ...m.certs.items.map((s) => p(s)))
    if (w === 'personal') {
      if (m.personal) out.push(h(m, m.personal.title), ...m.personal.lines.map((s) => p(s)))
      if (m.referees) {
        out.push(h(m, m.referees.title))
        for (const rf of m.referees.items) out.push(p(`${rf.name}, ${rf.position}, ${rf.org}`, { bold: true }), p(`${rf.email} | ${rf.phone}`, { size: 9, color: '444444' }))
      }
    }
  }
  return out
}

const cell = (children: Paragraph[], w: number, o: { fill?: string; borders?: boolean } = {}) =>
  new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    borders: o.borders ? undefined : NO_BORDERS,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children,
  })

const head = (m: DocModel): Paragraph[] => [
  ...(m.preface ? [p(m.preface, { size: 8, color: '666666' })] : []),
  p(m.name, { bold: true, size: 20 }),
  p(m.label, { size: 11, color: '1A3A5C' }),
  p(m.contacts.join('  |  '), { size: 9, color: '444444' }),
]

export async function renderDocx(m: DocModel, layout: Layout): Promise<Buffer> {
  let children: Array<Paragraph | Table>
  if (layout === 'one-column') {
    children = [...head(m), ...sectionParas(m, ['summary', 'jobs', 'edu', 'skills', 'projects', 'certs', 'personal'])]
  } else if (layout === 'two-column') {
    children = [
      ...(m.preface ? [p(m.preface, { size: 8, color: '666666' })] : []),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            cell([p('CONTACT', { bold: true, size: 11, color: '1A3A5C' }), ...m.contacts.map((c) => p(c, { size: 9 })), ...sectionParas(m, ['skills', 'edu', 'certs', 'personal'])], 33, { fill: 'EEF2F6' }),
            cell([p(m.name, { bold: true, size: 20 }), p(m.label, { size: 11, color: '1A3A5C' }), ...sectionParas(m, ['summary', 'jobs', 'projects'])], 67),
          ],
        })],
      }),
    ]
  } else if (layout === 'photo-header') {
    children = [
      ...(m.preface ? [p(m.preface, { size: 8, color: '666666' })] : []),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m.initials, bold: true, size: 40, color: '16324F' })] })], 18, { fill: 'E8B04A' }),
            cell([p(m.name, { bold: true, size: 20, color: 'FFFFFF' }), p(m.label, { size: 11, color: 'CFE0F0' }), p(m.contacts.join('   '), { size: 9, color: 'FFFFFF' })], 82, { fill: '16324F' }),
          ],
        })],
      }),
      ...sectionParas(m, ['summary', 'jobs', 'edu', 'skills', 'projects', 'certs', 'personal']),
    ]
  } else {
    const bordered = (ps: Paragraph[], w: number) => cell(ps, w, { borders: true })
    children = [
      ...head({ ...m, contacts: [] }).slice(0, m.preface ? 3 : 2),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: Array.from({ length: Math.ceil(m.contacts.length / 2) }, (_, i) =>
          new TableRow({ children: [bordered([p(m.contacts[i * 2], { size: 9 })], 50), bordered([p(m.contacts[i * 2 + 1] ?? '', { size: 9 })], 50)] })),
      }),
      ...sectionParas(m, ['summary']),
      h(m, m.jobs.title),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: m.mergedCells
          ? m.jobs.jobs.flatMap((j) => j.bullets.map((b, k) => new TableRow({
              children: [
                new TableCell({ width: { size: 43, type: WidthType.PERCENTAGE }, verticalMerge: k === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE, children: k === 0 ? [p(j.position, { bold: true }), p(j.org), p(j.period, { size: 9 })] : [p('')] }),
                bordered([p(b, { size: 9 })], 57),
              ],
            })))
          : m.jobs.jobs.map((j) => new TableRow({
              children: [bordered([p(j.period, { size: 9 })], 17), bordered([p(j.position, { bold: true }), p(j.org)], 26), bordered(j.bullets.map((b) => p(b, { size: 9 })), 57)],
            })),
      }),
      h(m, m.education.title),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: m.education.items.map((e) => new TableRow({
          children: [bordered([p(e.period, { size: 9 })], 17), bordered([p(`${e.degree} — ${e.inst}${e.score ? ` (${e.score})` : ''}`, { size: 9 })], 83)],
        })),
      }),
      h(m, m.skills.title),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: (() => {
          const items = m.skills.groups.flatMap((g) => g.items)
          const rows: TableRow[] = []
          for (let i = 0; i < items.length; i += 3) {
            rows.push(new TableRow({ children: [0, 1, 2].map((k) => bordered([p(items[i + k] ?? '', { size: 9 })], 33)) }))
          }
          return rows
        })(),
      }),
      ...sectionParas(m, ['projects', 'certs', 'personal']),
    ]
  }
  const doc = new Document({
    creator: 'synthetic', title: 'Synthetic CV',
    sections: [{
      headers: m.header ? { default: new Header({ children: [p(m.header, { size: 8, color: '777777' })] }) } : undefined,
      footers: m.footer ? { default: new Footer({ children: [p(m.footer, { size: 8, color: '777777' })] }) } : undefined,
      children,
    }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}
