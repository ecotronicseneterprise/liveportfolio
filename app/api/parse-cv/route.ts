import { NextRequest, NextResponse } from 'next/server'
import { importDocument } from '@/lib/connectors/document'
import { ImportError, LIMITS } from '@/lib/connectors/types'

// Backward-compatible alias: same endpoint, same success shape (new keys are additive:
// education, certifications, project url). Logic lives in lib/connectors/document.ts.
// Behaviour changes, deliberately: failures now return 422 { error, message } instead of
// 200 {}, and DOCX is accepted. The 429 `{}` response is unchanged.

// In-memory rate limit: 3 per IP per hour (unchanged). Best-effort only — resets on restart.
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

function fail(e: ImportError) {
  return NextResponse.json({ error: e.code, message: e.message }, { status: e.status })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({}, { status: 429 })
  }

  if (Number(req.headers.get('content-length') || 0) > LIMITS.maxFileBytes + 256 * 1024) {
    return fail(new ImportError('file_too_large', 'That file is larger than 5MB.'))
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return fail(new ImportError('no_file', 'No file was uploaded.'))
    }
    if (file.size > LIMITS.maxFileBytes) {
      return fail(new ImportError('file_too_large', 'That file is larger than 5MB.'))
    }

    const nameField = formData.get('name')
    const names = typeof nameField === 'string' && nameField.trim() ? [nameField.trim().slice(0, 80)] : undefined
    const { profile } = await importDocument({ buffer: Buffer.from(await file.arrayBuffer()) }, { names })

    return NextResponse.json({
      name: profile.name ?? null,
      role: profile.role ?? null,
      email: profile.email ?? null,
      location: profile.location ?? null,
      bio: profile.bio ?? null,
      github_url: profile.github_url ?? null,
      linkedin_url: profile.linkedin_url ?? null,
      skills: profile.skills ?? [],
      projects: profile.projects ?? [],
      experience: profile.experience ?? [],
      education: profile.education ?? [],
      certifications: profile.certifications ?? [],
    })
  } catch (err) {
    if (err instanceof ImportError) return fail(err)
    return fail(new ImportError('parse_failed', "We couldn't read your CV automatically."))
  }
}
