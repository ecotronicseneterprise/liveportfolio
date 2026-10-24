import { describe, it, expect } from 'vitest'
import { normalizeProfile, cleanUrl, stripBulletMarker } from '../lib/connectors/normalize'
import { mergeResults } from '../lib/connectors/merge'
import { applyDraftToForm, type FormSlice } from '../lib/connectors/to-form'
import { detectKind, importDocument, importText } from '../lib/connectors/document'
import { ImportError, type ConnectorResult } from '../lib/connectors/types'

describe('normalize', () => {
  it('strips bullet markers and drops empty / section-header bullets', () => {
    const p = normalizeProfile({
      experience: [{ company: 'Acme', role: 'Dev', period: '2020', bullets: ['▸ Built X', '•  ', 'Skills:', '- Shipped Y'] }],
    })
    expect(p.experience![0].bullets).toEqual(['Built X', 'Shipped Y'])
    expect(stripBulletMarker('→ hi')).toBe('hi')
  })
  it('only keeps http(s) URLs', () => {
    expect(cleanUrl('javascript:alert(1)')).toBeNull()
    expect(cleanUrl('github.com/foo')).toBe('https://github.com/foo')
    expect(cleanUrl('not a url')).toBeNull()
  })
  it('enforces caps', () => {
    const p = normalizeProfile({
      bio: 'x'.repeat(900),
      skills: Array.from({ length: 40 }, (_, i) => `s${i}`),
      projects: Array.from({ length: 9 }, (_, i) => ({ title: `p${i}`, description: 'd'.repeat(500), stack: [] })),
    })
    expect(p.bio!.length).toBe(500)
    expect(p.skills!.length).toBe(15)
    expect(p.projects!.length).toBe(4)
    expect(p.projects![0].description.length).toBe(200)
  })
})

const res = (source: ConnectorResult['source'], profile: ConnectorResult['profile']): ConnectorResult => ({
  source, profile, provenance: [], warnings: [],
})

describe('merge', () => {
  it('prefers CV scalars, unions skills, fills project slots from GitHub, warns on conflicts', () => {
    const { draft, warnings, provenance } = mergeResults([
      res('github', { name: 'Ada L', skills: ['TypeScript', 'Go'], projects: [{ title: 'gh-1', description: '', stack: [] }, { title: 'gh-2', description: '', stack: [] }] }),
      res('document', { name: 'Ada Lovelace', skills: ['typescript', 'SQL'], projects: [{ title: 'cv-1', description: 'x', stack: [] }] }),
    ])
    expect(draft.name).toBe('Ada Lovelace')
    expect(draft.skills).toEqual(['typescript', 'SQL', 'Go'])
    expect(draft.projects.map((p) => p.title)).toEqual(['cv-1', 'gh-1', 'gh-2'])
    expect(warnings.some((w) => w.startsWith('name differs'))).toBe(true)
    expect(provenance.find((p) => p.field === 'name')!.source).toBe('document')
  })
  it('dedupes projects by title across sources', () => {
    const { draft } = mergeResults([
      res('document', { projects: [{ title: 'Shop', description: 'a', stack: [] }] }),
      res('github', { projects: [{ title: 'shop', description: 'b', stack: [] }] }),
    ])
    expect(draft.projects).toHaveLength(1)
  })
})

describe('to-form adapter (preserves the original handleCvUpload contract)', () => {
  const base: FormSlice = {
    avatar_url: '', name: 'Keep', role: '', email: '', location: 'Lagos', bio: '', github_url: '', linkedin_url: '',
    directSkills: ['React'], certifications: [], projects: [], experience: [], education: [],
  }
  it('does not overwrite with empty values', () => {
    const out = applyDraftToForm(base, { location: '' })
    expect(out.name).toBe('Keep')
    expect(out.location).toBe('Lagos')
  })
  it('joins stack with ", " and bullets with newline; fills new fields', () => {
    const out = applyDraftToForm(base, {
      skills: ['react', 'Node'],
      projects: [{ title: 'P', description: 'D', stack: ['a', 'b'], url: 'https://x.dev' }],
      experience: [{ company: 'C', role: 'R', period: '2020', bullets: ['one', 'two'] }],
      education: [{ degree: 'BSc', institution: 'UNILAG', year: '2019' }],
      certifications: ['AWS CCP'],
    })
    expect(out.projects[0]).toMatchObject({ stack: 'a, b', url: 'https://x.dev', imageFile: null, image_preview: '' })
    expect(out.experience[0].bullets).toBe('one\ntwo')
    expect(out.directSkills).toEqual(['React', 'Node'])
    expect(out.education[0]).toEqual({ degree: 'BSc', institution: 'UNILAG', year: '2019', grade: '' })
    expect(out.certifications).toEqual(['AWS CCP'])
  })
})

describe('document guards (no AI call reached)', () => {
  it('detects type by magic bytes, not by name', () => {
    expect(detectKind(Buffer.from('%PDF-1.7 ...'))).toBe('pdf')
    expect(detectKind(Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from('word/document.xml')]))).toBe('docx')
    expect(detectKind(Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from('xl/workbook.xml')]))).toBeNull()
    expect(detectKind(Buffer.from('MZ an exe'))).toBeNull()
  })
  it('rejects unsupported and oversized files', async () => {
    await expect(importDocument({ buffer: Buffer.from('hello') })).rejects.toMatchObject({ code: 'unsupported_type' })
    await expect(importDocument({ buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })).rejects.toMatchObject({ code: 'file_too_large' })
  })
  it('rejects corrupt PDFs with an ImportError', async () => {
    await expect(importDocument({ buffer: Buffer.from('%PDF-1.4 garbage') })).rejects.toBeInstanceOf(ImportError)
  })
  it('enforces the text length bounds with 422-class codes', async () => {
    await expect(importText('too short')).rejects.toMatchObject({ code: 'no_text' })
    await expect(importText('word '.repeat(3000))).rejects.toMatchObject({ code: 'too_long' })
  })
})
