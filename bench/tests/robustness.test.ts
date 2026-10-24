// Robustness of the import path against hostile / broken inputs and upstream failures.
// OpenAI is mocked; nothing here calls the network. Production code is NOT modified: where behaviour is a
// gap, the test documents the current behaviour (named "KNOWN GAP") so a fix flips it deliberately.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PDFDocument from 'pdfkit'
import JSZip from 'jszip'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ mode: 'ok' as string, calls: 0 }))
vi.mock('openai', () => ({
  default: class {
    beta = {
      chat: {
        completions: {
          parse: async () => {
            h.calls++
            switch (h.mode) {
              case 'throw': throw new Error('ECONNRESET')
              case '429': throw Object.assign(new Error('rate limited'), { status: 429 })
              case 'refusal': return { choices: [{ message: { refusal: 'I cannot help with that', parsed: null } }] }
              case 'null': return { choices: [{ message: { parsed: null } }] }
              case 'badschema': return { choices: [{ message: { parsed: { name: 5, skills: 'not-an-array' } } }] }
              case 'hang': return new Promise(() => {})
              default:
                return { choices: [{ message: { parsed: { name: 'Ada Okafor', role: 'Backend Engineer', location: null, bio: 'x', skills: ['Go'], certifications: [], projects: [], experience: [{ company: 'Kola Systems', role: 'Engineer', period: '2020 - 2022', bullets: ['Built it'] }], education: [] } } }] }
            }
          },
        },
      },
    }
  },
}))

import { detectKind, importDocument, importText } from '../../lib/connectors/document'
import { ImportError, LIMITS } from '../../lib/connectors/types'
import { POST as parseCv } from '../../app/api/parse-cv/route'
import { POST as importRoute } from '../../app/api/import/route'
import { buildHardProfiles } from '../synthetic/hard'
import { toDocModel } from '../synthetic/model'
import { renderDocx } from '../synthetic/render-docx'

const NL = String.fromCharCode(10)
const CV_TEXT = ['Ada Okafor', 'Backend Engineer, Kola Systems 2020 - 2022', 'Built the payments reconciliation service.', 'Skills: Go, PostgreSQL, Docker', 'Education: BSc Computer Science, University of Lagos'].join(NL)

// pdfkit fixtures. Every file gets unique metadata so pdf-parse@1.1.1 (whose pdf.js 1.10 keeps cross-document
// state) is not handed structurally identical documents back to back — see the PDF extraction study.
let seq = 0
function pdfWith(draw: (d: PDFKit.PDFDocument) => void, opts: Record<string, unknown> = {}): Promise<Buffer> {
  return new Promise((resolve) => {
    const n = ++seq
    const d = new PDFDocument({ size: 'A4', info: { Title: 'fixture-' + n + '-' + 'x'.repeat(n * 13 % 97), CreationDate: new Date(2020, 0, 1, 0, 0, n) }, ...opts })
    const chunks: Buffer[] = []
    d.on('data', (c: Buffer) => chunks.push(c))
    d.on('end', () => resolve(Buffer.concat(chunks)))
    draw(d)
    d.end()
  })
}
const textPdf = (pages = 1) => pdfWith((d) => { for (let p = 0; p < pages; p++) { if (p) d.addPage(); d.fontSize(11).text(CV_TEXT + NL + 'page ' + (p + 1) + ' id ' + seq, 50, 50) } })
const scannedPdf = () => pdfWith((d) => { d.rect(50, 50, 400, 500).fill('#dddddd') }) // no text objects at all, like an image-only scan
const encryptedPdf = () => pdfWith((d) => d.text(CV_TEXT, 50, 50), { userPassword: 'secret', ownerPassword: 'owner' })
const goodDocx = async () => renderDocx(toDocModel(buildHardProfiles()[0]), 'one-column')

async function docxWithBody(xmlBody: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await goodDocx())
  zip.file('word/document.xml', xmlBody)
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

const code = async (p: Promise<unknown>) => { try { await p; return 'ok' } catch (e) { return e instanceof ImportError ? e.code : `non-ImportError:${(e as Error).message}` } }

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test'
  delete process.env.PII_ENGINE
  delete process.env.PII_ON_ENGINE_FAILURE
  h.mode = 'ok'
  h.calls = 0
})

// retry: pdf-parse@1.1.1 intermittently throws "bad XRef entry" on valid files (first parse in a fresh process is the
// usual victim — see the PDF extraction study). Retrying keeps these tests about the import path, not that flake.
describe('document inputs (importDocument)', { retry: 4 }, () => {
  it('rejects empty, tiny and random bytes as unsupported_type — before any AI call', async () => {
    for (const b of [Buffer.alloc(0), Buffer.from('x'), Buffer.from('MZ' + 'A'.repeat(500)), Buffer.alloc(2000, 0xff)]) {
      expect(await code(importDocument({ buffer: b }))).toBe('unsupported_type')
    }
    expect(h.calls).toBe(0)
  })

  it('trusts content, not the file name: a PDF is a PDF whatever it is called', () => {
    return textPdf().then((pdf) => expect(detectKind(pdf)).toBe('pdf'))
  })

  it('an xlsx/zip without word/document.xml is not mistaken for a DOCX', async () => {
    const zip = new JSZip(); zip.file('xl/workbook.xml', '<x/>')
    expect(await code(importDocument({ buffer: Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })) }))).toBe('unsupported_type')
  })

  it('file over 5 MB → file_too_large', async () => {
    expect(await code(importDocument({ buffer: Buffer.alloc(LIMITS.maxFileBytes + 1) }))).toBe('file_too_large')
  })

  it('a PDF longer than 6 pages → too_many_pages, no AI call', async () => {
    expect(await code(importDocument({ buffer: await textPdf(8) }))).toBe('too_many_pages')
    expect(h.calls).toBe(0)
  })

  it('scanned (image-only) PDF → no_text with an actionable message, no AI call', async () => {
    const err = await importDocument({ buffer: await scannedPdf() }).catch((e) => e)
    expect(err).toBeInstanceOf(ImportError)
    expect(err.code).toBe('no_text')
    expect(err.message).toMatch(/scanned|image/i)
    expect(h.calls).toBe(0)
  })

  it('password-protected PDF → parse_failed with a password/corruption hint, no AI call', async () => {
    const err = await importDocument({ buffer: await encryptedPdf() }).catch((e) => e)
    expect(err.code).toBe('parse_failed')
    expect(err.message).toMatch(/password|corrupt/i)
    expect(h.calls).toBe(0)
  })

  it('truncated/corrupted PDF and DOCX → parse_failed (never a crash)', async () => {
    const pdf = await textPdf()
    expect(await code(importDocument({ buffer: pdf.subarray(0, Math.floor(pdf.length / 2)) }))).toBe('parse_failed')
    const docx = await goodDocx()
    const cut = Buffer.concat([docx.subarray(0, 4), docx.subarray(4, 400), Buffer.from('word/document.xml')])
    expect(await code(importDocument({ buffer: cut }))).toBe('parse_failed')
    expect(h.calls).toBe(0)
  })

  it('text over 12,000 characters → too_long (422), under 40 → no_text', async () => {
    expect(await code(importText('word '.repeat(4000)))).toBe('too_long')
    expect(await code(importText('hi'))).toBe('no_text')
  })

  it('a valid text PDF and a valid DOCX go through (AI mocked)', async () => {
    expect((await importDocument({ buffer: await textPdf() })).profile.name).toBe('Ada Okafor')
    expect((await importDocument({ buffer: await goodDocx() })).profile.name).toBe('Ada Okafor')
  })

  it('DOCX body containing a script payload is treated as plain text (no execution surface)', async () => {
    const docx = await docxWithBody('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + CV_TEXT.replace(/</g, '&lt;') + ' &lt;script&gt;alert(1)&lt;/script&gt; javascript:alert(1)</w:t></w:r></w:p></w:body></w:document>')
    const r = await importDocument({ buffer: docx })
    expect(JSON.stringify(r.profile)).not.toMatch(/<script/i)
  })
})

describe('callLLM failure injection (through the import path)', () => {
  const modes: Array<[string, string]> = [['throw', 'network error'], ['429', 'upstream rate limit'], ['refusal', 'model refusal'], ['null', 'empty parse'], ['badschema', 'schema-invalid output']]
  for (const [mode, label] of modes) {
    it(`${label} → ImportError(parse_failed), user-safe message, no raw error leaks`, async () => {
      h.mode = mode
      const err = await importText(CV_TEXT).catch((e) => e)
      expect(err).toBeInstanceOf(ImportError)
      expect(err.code).toBe('parse_failed')
      expect(err.message).not.toMatch(/ECONNRESET|rate limited|Error:|stack/)
      expect(h.calls).toBe(1)
    })
  }

  it('privacy filter unavailable → 503-class pii_unavailable and NOTHING is sent', async () => {
    process.env.PII_ENGINE = 'presidio' // not shipped → engine failure
    const err = await importText(CV_TEXT).catch((e) => e)
    expect(err.code).toBe('pii_unavailable')
    expect(err.status).toBe(503)
    expect(h.calls).toBe(0)
  })

  it('missing API key → parse_failed (configuration), no call', async () => {
    delete process.env.OPENAI_API_KEY
    expect(await code(importText(CV_TEXT))).toBe('parse_failed')
    expect(h.calls).toBe(0)
  })

  it('KNOWN GAP — an upstream that never answers is never cut off (no timeout in callLLM)', async () => {
    h.mode = 'hang'
    const settled = await Promise.race([importText(CV_TEXT).then(() => 'settled', () => 'settled'), new Promise((r) => setTimeout(() => r('still pending after 1.5 s'), 1500))])
    expect(settled).toBe('still pending after 1.5 s') // when a timeout is added this should become 'settled'
  })
})

describe('route level (/api/parse-cv and /api/import)', { retry: 4 }, () => {
  const req = (url: string, form: FormData, ip: string, extra: Record<string, string> = {}) =>
    new NextRequest(url, { method: 'POST', body: form, headers: { 'x-forwarded-for': ip, ...extra } })
  const file = (bytes: Buffer, name: string, type = 'application/pdf') => new File([new Uint8Array(bytes)], name, { type })

  it('parse-cv: empty upload → 422 no_file; garbage named .pdf → 422 unsupported_type', async () => {
    const f1 = new FormData(); f1.append('file', file(Buffer.alloc(0), 'cv.pdf'))
    const r1 = await parseCv(req('http://x/api/parse-cv', f1, '10.0.0.1'))
    expect([r1.status, (await r1.json()).error]).toEqual([422, 'no_file'])
    const f2 = new FormData(); f2.append('file', file(Buffer.from('not a pdf at all, just text'), 'cv.pdf'))
    const r2 = await parseCv(req('http://x/api/parse-cv', f2, '10.0.0.2'))
    expect([r2.status, (await r2.json()).error]).toEqual([422, 'unsupported_type'])
  })

  it('parse-cv: a real PDF uploaded with a .docx name and wrong MIME is still processed as a PDF', async () => {
    const f = new FormData(); f.append('file', file(await textPdf(), 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
    const r = await parseCv(req('http://x/api/parse-cv', f, '10.0.' + Math.floor(Math.random() * 250) + '.3'))
    expect(r.status).toBe(200)
    expect((await r.json()).name).toBe('Ada Okafor')
  })

  it('parse-cv: oversized body is refused by Content-Length (413) and by file size', async () => {
    const f = new FormData(); f.append('file', file(Buffer.alloc(10), 'cv.pdf'))
    const r = await parseCv(req('http://x/api/parse-cv', f, '10.0.0.4', { 'content-length': String(6 * 1024 * 1024) }))
    expect(r.status).toBe(413)
    const big = new FormData(); big.append('file', file(Buffer.alloc(LIMITS.maxFileBytes + 1), 'cv.pdf'))
    expect((await parseCv(req('http://x/api/parse-cv', big, '10.0.0.5'))).status).toBe(413)
  })

  it('parse-cv: the 4th request from one IP in an hour → 429 {}', async () => {
    const ok = await textPdf()
    const statuses: number[] = []
    const ip = '10.9.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) // fresh bucket per attempt
    for (let i = 0; i < 4; i++) { const f = new FormData(); f.append('file', file(ok, 'cv.pdf')); statuses.push((await parseCv(req('http://x/api/parse-cv', f, ip))).status) }
    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it('import: flag off → 404; unusable body → 422 no_file', async () => {
    delete process.env.IMPORT_ENABLED
    const f = new FormData(); f.append('github', 'octocat')
    expect((await importRoute(req('http://x/api/import', f, '10.0.1.1'))).status).toBe(404)
    process.env.IMPORT_ENABLED = 'true'
    const r = await importRoute(req('http://x/api/import', new FormData(), '10.0.1.2'))
    expect([r.status, (await r.json()).error]).toEqual([422, 'no_file'])
  })

  it('import: AI failure → 422 parse_failed JSON (no stack trace, no provider text)', async () => {
    process.env.IMPORT_ENABLED = 'true'
    h.mode = 'throw'
    const f = new FormData(); f.append('text', CV_TEXT)
    const r = await importRoute(req('http://x/api/import', f, '10.0.1.3'))
    const body = await r.json()
    expect(r.status).toBe(422)
    expect(JSON.stringify(body)).not.toMatch(/ECONNRESET|stack|Error:/)
  })

  it('import: privacy filter down → 503', async () => {
    process.env.IMPORT_ENABLED = 'true'
    process.env.PII_ENGINE = 'presidio'
    const f = new FormData(); f.append('text', CV_TEXT)
    expect((await importRoute(req('http://x/api/import', f, '10.0.1.4'))).status).toBe(503)
    expect(h.calls).toBe(0)
  })
})
