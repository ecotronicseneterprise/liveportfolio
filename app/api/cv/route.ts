import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { entitlements } from '@/lib/entitlements'
import { allow } from '@/lib/connectors/limits'
import { buildCvModel } from '@/lib/cv/model'
import { exportCv, isCvFormat } from '@/lib/cv/export'
import type { PortfolioContent } from '@/components/templates/Minimal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

// GET /api/cv?format=pdf|docx[&contact=0]      the file, generated now from the stored portfolio (nothing is saved)
// GET /api/cv?report=1[&contact=0]             JSON: what the file would leave out (no file is built)
//
// Authenticated with the user's Bearer token like the other dashboard routes. The plan is checked HERE, not only in the dashboard:
// a PDF is for every plan, a Word file for Pro. The file holds personal details, so it is never cached.
// The per-user limit is the in-process one the other routes use (a backstop: the export costs no money, only a little CPU); a
// database-backed counter needs 'cv_export' added to the usage_events kind check, which is a migration for the owner to decide.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!allow(`cv:${user.id}`, 60, 60 * 60 * 1000)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const params = req.nextUrl.searchParams
  const includeContact = params.get('contact') !== '0'
  const reportOnly = params.get('report') === '1'
  const format = params.get('format')
  if (!reportOnly && !isCvFormat(format)) return NextResponse.json({ error: 'invalid_format' }, { status: 400 })

  const ent = await entitlements(user.id)
  if (!reportOnly && format === 'pdf' && !ent.cvPdf) return NextResponse.json({ error: 'upgrade_required', feature: 'cv_pdf' }, { status: 403 })
  if (!reportOnly && format === 'docx' && !ent.cvDocx) return NextResponse.json({ error: 'upgrade_required', feature: 'cv_docx' }, { status: 403 })

  const admin = getSupabaseAdmin()
  const [{ data: portfolio }, { data: row }] = await Promise.all([
    admin.from('portfolios').select('content').eq('user_id', user.id).limit(1).maybeSingle(),
    admin.from('users').select('slug').eq('id', user.id).maybeSingle(),
  ])
  const content = (portfolio as { content?: Partial<PortfolioContent> } | null)?.content
  if (!content) return NextResponse.json({ error: 'no_portfolio' }, { status: 404 })
  const slug = (row as { slug?: string | null } | null)?.slug
  const url = slug ? `${APP_URL}/${slug}` : undefined

  if (reportOnly) {
    const { report } = buildCvModel(content, { includeContact, url })
    return NextResponse.json({ omitted: report.omitted, contactIncluded: report.contactIncluded }, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const file = await exportCv(content, format as 'pdf' | 'docx', { includeContact, url })
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': String(file.buffer.length),
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[cv] export failed:', e instanceof Error ? e.message : 'unknown') // never the content
    return NextResponse.json({ error: 'export_failed' }, { status: 500 })
  }
}
