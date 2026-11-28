// CV as a Word document. Built to be EDITED: named styles (Title, Heading 1 for sections, Heading 2 for each role or project, List Bullet) and
// real Word lists, so the person can restyle everything from the Styles pane. Calibri is not embedded: Word draws it itself (it covers the
// Yoruba letters), and the file stays small and editable. One column, no tables, no text boxes, no images, no header or footer content.
import { AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, TextRun } from 'docx'
import { hasSection, SECTION_TITLE, type CvModel, type CvSection } from './model'

const FONT = 'Calibri'
const BULLETS = 'cv-bullets'

const plain = (text: string, o: { bold?: boolean; size?: number; after?: number; style?: string } = {}) =>
  new Paragraph({ style: o.style, spacing: { after: o.after ?? 40 }, children: [new TextRun({ text, bold: o.bold, size: o.size })] })
const bullet = (text: string) => new Paragraph({ style: 'ListBullet', numbering: { reference: BULLETS, level: 0 }, children: [new TextRun({ text })] })

export async function renderDocx(model: CvModel): Promise<Buffer> {
  const children: Paragraph[] = []
  if (model.name) children.push(new Paragraph({ style: 'Title', children: [new TextRun({ text: model.name })] }))
  for (const t of model.title) children.push(plain(t, { size: 23 }))
  if (model.contactLine.length) children.push(plain(model.contactLine.join('  |  ')))
  for (const l of model.links) children.push(plain(l, { after: 0 }))

  const draw: Record<CvSection, () => void> = {
    summary: () => { for (const p of model.summary) children.push(plain(p, { after: 80 })) },
    experience: () => {
      for (const e of model.experience) {
        children.push(new Paragraph({ style: 'Heading2', keepNext: true, children: [new TextRun({ text: [e.role, e.company].filter(Boolean).join(', ') })] }))
        if (e.period) children.push(new Paragraph({ keepNext: e.bullets.length > 0, spacing: { after: 40 }, children: [new TextRun({ text: e.period })] }))
        for (const b of e.bullets) children.push(bullet(b))
      }
    },
    skills: () => {
      for (const g of model.skills) children.push(plain(g.category ? `${g.category}: ${g.items.join(', ')}` : g.items.join(', '), { after: 60 }))
    },
    projects: () => {
      for (const p of model.projects) {
        children.push(new Paragraph({ style: 'Heading2', keepNext: true, children: [new TextRun({ text: p.title })] }))
        if (p.stack.length) children.push(plain(`Stack: ${p.stack.join(', ')}`))
        if (p.problem) children.push(bullet(`Problem: ${p.problem}`))
        if (p.solution) children.push(bullet(`Solution: ${p.solution}`))
        if (p.outcome) children.push(bullet(`Outcome: ${p.outcome}`))
        if (p.url) children.push(plain(`Link: ${p.url}`, { after: 0 }))
        if (p.sourceUrl) children.push(plain(`Source: ${p.sourceUrl}`, { after: 0 }))
      }
    },
    education: () => { for (const e of model.education) children.push(plain(e, { after: 60 })) },
    certifications: () => { for (const c of model.certifications) children.push(bullet(c)) },
    awards: () => {
      for (const a of model.awards) {
        children.push(new Paragraph({ style: 'Heading2', keepNext: true, children: [new TextRun({ text: [a.title, a.issuer, a.year].filter(Boolean).join(', ') })] }))
        if (a.description) children.push(plain(a.description))
        if (a.url) children.push(plain(`Link: ${a.url}`, { after: 0 }))
      }
    },
  }
  for (const k of model.order) {
    if (!hasSection(model, k)) continue
    children.push(new Paragraph({ style: 'Heading1', keepNext: true, children: [new TextRun({ text: SECTION_TITLE[k] })] }))
    draw[k]()
  }

  const doc = new Document({
    creator: model.name || 'LivePortfolio',
    title: `${model.name || 'CV'} - CV`,
    description: model.provenance,
    lastModifiedBy: 'LivePortfolio',
    styles: {
      default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { after: 40, line: 264 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 40, bold: true }, paragraph: { spacing: { after: 40 } } },
        {
          id: 'Heading1', name: 'heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 24, bold: true },
          paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } } },
        },
        { id: 'Heading2', name: 'heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 21, bold: true }, paragraph: { spacing: { before: 100, after: 20 }, outlineLevel: 1 } },
        { id: 'ListBullet', name: 'List Bullet', basedOn: 'Normal', quickFormat: true, paragraph: { spacing: { after: 30 } } },
      ],
    },
    numbering: {
      config: [{
        reference: BULLETS,
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }],
      }],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children,
    }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}
