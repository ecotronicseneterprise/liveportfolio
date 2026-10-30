import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import { getIpInfo } from '@/lib/ipinfo'
import type { getSupabaseAdmin } from '@/lib/supabase'

const HOUR = 3_600_000
const DEMOS = new Set(['james-chen', 'sofia-martinez', 'fatima-hassan', 'david-mensah', 'priya-sharma', 'chidi-okafor', 'michael-roberts', 'elena-vasquez'])
const BOT = /bot|crawler|spider|facebookexternalhit|slurp|archiver|curl|wget|python|java|ruby|php|perl|libwww|headless|playwright|phantomjs|puppeteer|selenium|lighthouse|pagespeed/i

export function trackablePortfolio(slug: string, dashboardPreview: boolean) {
  return !dashboardPreview && !DEMOS.has(slug.toLowerCase())
}

export function visitorFromHeaders(headers: Pick<Headers, 'get'>) {
  const ua = headers.get('user-agent') || ''
  if (!ua || BOT.test(ua) || headers.get('next-router-prefetch') === '1' || /prefetch|prerender/i.test(`${headers.get('purpose')} ${headers.get('sec-purpose')}`)) return null
  const ip = (headers.get('x-forwarded-for')?.split(',')[0] || headers.get('x-real-ip') || '').trim()
  if (!isIP(ip)) return null
  const device = /tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua) ? 'tablet' : /mobile|iphone|ipod|phone|android|blackberry|iemobile|opera mini/i.test(ua) ? 'mobile' : 'desktop'
  return { ip, ipHash: createHash('sha256').update(ip).digest('hex').slice(0, 16), device }
}

export function safeReferrer(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) ? url.origin.slice(0, 500) : null
  } catch { return null }
}

export interface VisitReceipt { id: string; at: number; signature: string }

function sign(portfolioId: string, id: string, at: number) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Analytics signing configuration missing')
  return createHmac('sha256', key).update(`portfolio-visit:v1:${portfolioId}:${id}:${at}`).digest('hex')
}

export function createVisitReceipt(portfolioId: string, ipHash: string, at = Date.now()): VisitReceipt {
  // The primary key is the durable lock, shared by every instance and both tracking paths.
  const hex = createHash('sha256').update(`portfolio-visit:v1:${portfolioId}:${ipHash}:${Math.floor(at / HOUR)}`).digest('hex')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  return { id, at, signature: sign(portfolioId, id, at) }
}

export function validVisitReceipt(portfolioId: string, value: unknown, now = Date.now()): value is VisitReceipt {
  if (!value || typeof value !== 'object') return false
  const r = value as VisitReceipt
  if (typeof r.id !== 'string' || !/^[a-f0-9-]{36}$/.test(r.id) || !Number.isSafeInteger(r.at) || r.at > now + 60_000 || now - r.at > 24 * HOUR || typeof r.signature !== 'string' || !/^[a-f0-9]{64}$/.test(r.signature)) return false
  return timingSafeEqual(Buffer.from(r.signature, 'hex'), Buffer.from(sign(portfolioId, r.id, r.at), 'hex'))
}

export async function recordVisit(db: ReturnType<typeof getSupabaseAdmin>, portfolioId: string, receipt: VisitReceipt, visitor: NonNullable<ReturnType<typeof visitorFromHeaders>>, referrer: string | null, confirmed: boolean) {
  const { company, country } = await getIpInfo(visitor.ip, visitor.ipHash, db)
  const payload = {
    id: receipt.id,
    portfolio_id: portfolioId,
    event_type: 'portfolio_view',
    label: confirmed ? 'confirmed' : null,
    created_at: new Date(receipt.at).toISOString(),
    referrer,
    ip_hash: visitor.ipHash,
    company,
    country,
    device_type: visitor.device,
  }

  const { data: existing } = await db.from('analytics_events').select('id, label, country').eq('id', receipt.id).maybeSingle()
  if (!existing) {
    const { error } = await db.from('analytics_events').insert(payload)
    if (error) throw new Error('Analytics visit insert failed')
    const { error: countError } = await db.rpc('increment_view_count', { portfolio_id: portfolioId })
    if (countError) console.warn('[analytics] view counter update failed')
    return
  }

  if (confirmed && (existing.label !== 'confirmed' || (!existing.country && country))) {
    const patch: { label?: string; country?: string | null; company?: string | null } = { label: 'confirmed' }
    if (!existing.country && country) {
      patch.country = country
      patch.company = company
    }
    const { error: updateError } = await db.from('analytics_events').update(patch).eq('id', receipt.id).eq('portfolio_id', portfolioId).eq('event_type', 'portfolio_view')
    if (updateError) throw new Error('Analytics confirmation failed')
  }
}
