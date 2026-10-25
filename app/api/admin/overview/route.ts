import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { adminAuthorised } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/overview: the owner's view of the business, read-only. Counts, the last 30 days of sign-ups, money, cohort links and how many
// of their people have converted, who has asked for a refund, and the most recent sign-ups and payments. Only the owner (signed in, verified
// e-mail on the owner list) or the operations secret gets in. Every section fails on its own, so one slow query never blanks the page.
const DAY = 86_400_000

type Admin = ReturnType<typeof getSupabaseAdmin>
const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => { try { return await fn() } catch { return null } }
const count = async (q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> => { const r = await q; return r.error ? null : (r.count ?? 0) }

export async function GET(req: NextRequest) {
  if (!(await adminAuthorised(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const admin: Admin = getSupabaseAdmin()
  const now = Date.now()
  const since30 = new Date(now - 30 * DAY).toISOString()
  const since7 = new Date(now - 7 * DAY).toISOString()

  const users = await safe(async () => ({
    total: await count(admin.from('users').select('id', { count: 'exact', head: true })),
    free: await count(admin.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'unpublished')),
    basic: await count(admin.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'basic')),
    pro: await count(admin.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'pro')),
    cohort: await count(admin.from('users').select('id', { count: 'exact', head: true }).not('bootcamp_code', 'is', null)),
    last7: await count(admin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', since7)),
    last30: await count(admin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', since30)),
  }))

  const portfolios = await safe(() => count(admin.from('portfolios').select('id', { count: 'exact', head: true })))

  const signupsByDay = await safe(async () => {
    const { data } = await admin.from('users').select('created_at').gte('created_at', since30).limit(5000)
    const days: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) days[new Date(now - i * DAY).toISOString().slice(0, 10)] = 0
    for (const r of (data ?? []) as Array<{ created_at: string }>) { const k = r.created_at?.slice(0, 10); if (k in days) days[k]++ }
    return Object.entries(days).map(([date, n]) => ({ date, n }))
  })

  const recentSignups = await safe(async () => {
    const { data, error } = await admin.from('users').select('email, slug, plan, bootcamp_code, created_at').order('created_at', { ascending: false }).limit(10)
    if (error) throw new Error('users')
    return (data ?? []) as Array<{ email: string; slug: string; plan: string; bootcamp_code: string | null; created_at: string }>
  })

  const payments = await safe(async () => {
    const { data, error } = await admin
      .from('payments')
      .select('user_id, product_tier, amount_cents, created_at, refunded_at, ls_order_id')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error('payments') // shown as unknown, not as zero
    const rows = (data ?? []) as Array<{ user_id: string; product_tier: string; amount_cents: number; created_at: string; refunded_at: string | null; ls_order_id: string }>
    const kept = rows.filter((p) => !p.refunded_at)
    const sum = (list: typeof rows) => list.reduce((n, p) => n + (p.amount_cents || 0), 0)
    const ids = Array.from(new Set(rows.slice(0, 10).map((p) => p.user_id)))
    const { data: us } = ids.length ? await admin.from('users').select('id, email').in('id', ids) : { data: [] }
    const email = new Map(((us ?? []) as Array<{ id: string; email: string }>).map((u) => [u.id, u.email]))
    return {
      count: rows.length,
      revenue_kobo: sum(kept),
      revenue_30d_kobo: sum(kept.filter((p) => p.created_at >= since30)),
      refunded_count: rows.length - kept.length,
      recent: rows.slice(0, 10).map((p) => ({ email: email.get(p.user_id) ?? '', plan: p.product_tier, amount_kobo: p.amount_cents, at: p.created_at, refunded: !!p.refunded_at })),
    }
  })

  const refundRequests = await safe(async () => {
    const { data } = await admin
      .from('payment_intents')
      .select('user_id, tier, amount_kobo, reference, paid_at')
      .eq('access_code', 'refund_requested')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(20)
    const rows = (data ?? []) as Array<{ user_id: string; tier: string; amount_kobo: number; reference: string; paid_at: string | null }>
    const ids = Array.from(new Set(rows.map((r) => r.user_id)))
    const { data: us } = ids.length ? await admin.from('users').select('id, email').in('id', ids) : { data: [] }
    const email = new Map(((us ?? []) as Array<{ id: string; email: string }>).map((u) => [u.id, u.email]))
    return rows.map((r) => ({ email: email.get(r.user_id) ?? '', plan: r.tier, amount_kobo: r.amount_kobo, reference: r.reference, paid_at: r.paid_at }))
  })

  const cohorts = await safe(async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
    const { data: codes, error: codesErr } = await admin.from('bootcamp_codes').select('code, name, plan_to_grant, active, max_uses, use_count, created_at').order('created_at', { ascending: false })
    if (codesErr) throw new Error('codes')
    const { data: members } = await admin.from('users').select('id, bootcamp_code, plan_expires_at').not('bootcamp_code', 'is', null).limit(5000)
    const people = (members ?? []) as Array<{ id: string; bootcamp_code: string; plan_expires_at: string | null }>
    const ids = people.map((m) => m.id)
    let paid = new Set<string>()
    if (ids.length) {
      const { data: subs } = await admin.from('subscriptions').select('user_id').in('user_id', ids.slice(0, 1000)).in('status', ['active', 'cancelled']).gt('expires_at', new Date(now).toISOString())
      paid = new Set(((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id))
    }
    return ((codes ?? []) as Array<{ code: string; name: string; plan_to_grant: string; active: boolean; max_uses: number | null; use_count: number; created_at: string }>).map((c) => {
      const mine = people.filter((p) => p.bootcamp_code === c.code)
      return {
        ...c,
        link: `${appUrl}/bootcamp/${c.code}`,
        members: mine.length,
        converted: mine.filter((p) => paid.has(p.id)).length,
        ending_soon: mine.filter((p) => p.plan_expires_at && new Date(p.plan_expires_at).getTime() - now < 30 * DAY && new Date(p.plan_expires_at).getTime() > now && !paid.has(p.id)).length,
      }
    })
  })

  return NextResponse.json({ ok: true, generated_at: new Date(now).toISOString(), users, portfolios, signupsByDay, recentSignups, payments, refundRequests, cohorts })
}
