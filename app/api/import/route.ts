import { NextRequest, NextResponse } from 'next/server'
import { importDocument, importText } from '@/lib/connectors/document'
import { importGithub } from '@/lib/connectors/github'
import { mergeResults } from '@/lib/connectors/merge'
import { allow, clientIp, DAY_MS, IMPORT_PER_IP_PER_DAY, withinDailyCap } from '@/lib/connectors/limits'
import { ConnectorResult, ImportError, LIMITS } from '@/lib/connectors/types'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = LIMITS.maxFileBytes + 256 * 1024
const MAX_RAW_TEXT = 50_000

function fail(e: ImportError) {
  return NextResponse.json({ error: e.code, message: e.message }, { status: e.status })
}

// POST /api/import — multipart/form-data with any of: file (PDF/DOCX), text, github.
// Feature-flagged (IMPORT_ENABLED=true). Anonymous by design: users import before sign-up.
export async function POST(req: NextRequest) {
  if (process.env.IMPORT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 })
  }

  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > MAX_BODY_BYTES) {
    return fail(new ImportError('file_too_large', 'That upload is too large.'))
  }

  // Best-effort only — see lib/connectors/limits.ts. Edge rate limiting is the real control.
  if (!allow(`import:${clientIp(req)}`, IMPORT_PER_IP_PER_DAY, DAY_MS)) {
    return fail(new ImportError('rate_limited', 'Too many imports today. Please try again tomorrow.'))
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail(new ImportError('no_file', 'Send a file, pasted text or a GitHub username.'))
  }

  const file = form.get('file')
  const text = form.get('text')
  const github = form.get('github')

  const jobs: Array<Promise<ConnectorResult>> = []
  const usesAi = (file instanceof File && file.size > 0) || (typeof text === 'string' && text.trim())

  if (usesAi && !withinDailyCap()) {
    return fail(new ImportError('rate_limited', 'Imports are temporarily unavailable. Please fill the form manually.'))
  }

  if (file instanceof File && file.size > 0) {
    if (file.size > LIMITS.maxFileBytes) {
      return fail(new ImportError('file_too_large', 'That file is larger than 5MB.'))
    }
    jobs.push(file.arrayBuffer().then((ab) => importDocument({ buffer: Buffer.from(ab) })))
  }
  if (typeof text === 'string' && text.trim()) {
    if (text.length > MAX_RAW_TEXT) {
      return fail(new ImportError('too_long', 'That text is too long.'))
    }
    jobs.push(importText(text))
  }
  if (typeof github === 'string' && github.trim()) {
    jobs.push(importGithub(github))
  }

  if (jobs.length === 0) {
    return fail(new ImportError('no_file', 'Send a file, pasted text or a GitHub username.'))
  }

  const settled = await Promise.allSettled(jobs)
  const results: ConnectorResult[] = []
  const errors: Array<{ error: string; message: string }> = []
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(s.value)
    else if (s.reason instanceof ImportError) errors.push({ error: s.reason.code, message: s.reason.message })
    else errors.push({ error: 'parse_failed', message: 'Something went wrong importing one of your sources.' })
  }

  // Everything failed → surface the first reason with its proper status.
  if (results.length === 0) {
    const first = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult
    return first.reason instanceof ImportError
      ? fail(first.reason)
      : NextResponse.json(errors[0], { status: 422 })
  }

  const { draft, provenance, warnings } = mergeResults(results)
  return NextResponse.json({ draft, provenance, warnings, errors })
}
