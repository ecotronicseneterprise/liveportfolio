import { ConnectorResult, ImportError, LIMITS, Provenance, SourceName } from './types'
import { structure } from './structure'

export type DocKind = 'pdf' | 'docx'

/** Identify the file by content, never by the client-supplied MIME type or extension. */
export function detectKind(buf: Buffer): DocKind | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf'
  // DOCX is a ZIP (PK\x03\x04) whose central directory names word/document.xml in clear text.
  if (
    buf.length >= 4 &&
    buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04 &&
    buf.includes('word/document.xml')
  ) {
    return 'docx'
  }
  return null
}

export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractText(buf: Buffer, kind: DocKind): Promise<string> {
  if (kind === 'pdf') {
    // Dynamic import: pdf-parse's index runs debug code at import time in some builds.
    const pdfParse = (await import('pdf-parse')).default
    // max = MAX_PAGES + 1 so we can detect "too many pages" without parsing a huge file.
    const parsed = await pdfParse(buf, { max: LIMITS.maxPages + 1 })
    if (parsed.numpages > LIMITS.maxPages) {
      throw new ImportError('too_many_pages', `CVs longer than ${LIMITS.maxPages} pages aren't supported.`)
    }
    return cleanText(parsed.text)
  }
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer: buf })
  return cleanText(value)
}

function checkText(text: string, fromFile: boolean): string {
  if (text.length < LIMITS.minTextChars) {
    throw new ImportError(
      'no_text',
      fromFile
        ? "We couldn't find readable text in that file. Scanned or image-only CVs aren't supported yet."
        : 'That text is too short to extract anything from.'
    )
  }
  if (text.length > LIMITS.maxTextChars) {
    throw new ImportError(
      'too_long',
      `That's longer than ${LIMITS.maxTextChars.toLocaleString()} characters. Shorten it or upload only the key pages.`
    )
  }
  return text
}

const URL_RE = {
  github: /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?![\w/-])/i,
  linkedin: /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+/i,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
}

/** Deterministic pass: fields that never need a model. */
function deterministic(text: string) {
  return {
    email: text.match(URL_RE.email)?.[0] ?? null,
    github_url: text.match(URL_RE.github)?.[0] ?? null,
    linkedin_url: text.match(URL_RE.linkedin)?.[0] ?? null,
  }
}

export interface ImportOptions {
  /** Names already known (e.g. typed into the form) — exact-match redacted before the AI call. */
  names?: string[]
}

async function run(text: string, source: SourceName, opts: ImportOptions): Promise<ConnectorResult> {
  const det = deterministic(text)
  const { profile: ai, warnings } = await structure(text, { names: opts.names })

  // Contact fields come from local detection ONLY — never from model output.
  const profile = {
    ...ai,
    email: det.email ?? undefined,
    github_url: det.github_url ?? undefined,
    linkedin_url: det.linkedin_url ?? undefined,
  }

  const provenance: Provenance[] = (Object.keys(profile) as Array<keyof typeof profile>)
    .filter((k) => {
      const v = profile[k]
      return Array.isArray(v) ? v.length > 0 : !!v
    })
    .map((field) => ({ field, source }))

  return { source, profile, provenance, warnings }
}

/** CV file (PDF/DOCX) → ConnectorResult. Throws ImportError with a user-safe message. */
export async function importDocument(file: { buffer: Buffer }, opts: ImportOptions = {}): Promise<ConnectorResult> {
  if (file.buffer.length > LIMITS.maxFileBytes) {
    throw new ImportError('file_too_large', 'That file is larger than 5MB.')
  }
  const kind = detectKind(file.buffer)
  if (!kind) {
    throw new ImportError('unsupported_type', 'Please upload a PDF or Word (.docx) file.')
  }

  let text: string
  try {
    text = await extractText(file.buffer, kind)
  } catch (err) {
    if (err instanceof ImportError) throw err
    throw new ImportError('parse_failed', "We couldn't open that file. It may be corrupted or password-protected.")
  }
  return run(checkText(text, true), 'document', opts)
}

/** Pasted text (bio, LinkedIn sections, old CV) → ConnectorResult. */
export async function importText(raw: string, opts: ImportOptions = {}): Promise<ConnectorResult> {
  return run(checkText(cleanText(raw), false), 'text', opts)
}
