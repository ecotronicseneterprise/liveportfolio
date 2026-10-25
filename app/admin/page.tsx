'use client'

// The owner's dashboard (read-only numbers, plus creating and switching off cohort links). You sign in with your own account; the server only
// answers when that account's verified e-mail is on the owner list (lib/admin/auth.ts). Internal page: plain English, no translations.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { SIGNIN_HREF } from '@/lib/onboarding/entry'
import { formatNaira } from '@/lib/billing/copy'

interface Cohort { code: string; name: string; plan_to_grant: string; active: boolean; max_uses: number | null; use_count: number; link: string; members: number; converted: number; ending_soon: number }
interface Overview {
  generated_at: string
  users: { total: number | null; free: number | null; basic: number | null; pro: number | null; cohort: number | null; last7: number | null; last30: number | null } | null
  portfolios: number | null
  signupsByDay: Array<{ date: string; n: number }> | null
  recentSignups: Array<{ email: string; slug: string; plan: string; bootcamp_code: string | null; created_at: string }> | null
  payments: { count: number; revenue_kobo: number; revenue_30d_kobo: number; refunded_count: number; recent: Array<{ email: string; plan: string; amount_kobo: number; at: string; refunded: boolean }> } | null
  refundRequests: Array<{ email: string; plan: string; amount_kobo: number; reference: string; paid_at: string | null }> | null
  cohorts: Cohort[] | null
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? '–' : v.toLocaleString('en-GB'))
const money = (kobo: number | null | undefined) => (kobo === null || kobo === undefined ? '–' : formatNaira(kobo / 100))
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const card = 'bg-white border border-gray-200 rounded-xl p-4'
const th = 'text-left text-xs font-semibold uppercase tracking-wide text-gray-600 py-2 pr-4'
const td = 'py-2 pr-4 text-sm text-gray-900 align-top'

export default function AdminPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined) // undefined = checking
  const [data, setData] = useState<Overview | null>(null)
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', plan: 'basic', max: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: s }) => setToken(s.session?.access_token ?? null)).catch(() => setToken(null))
  }, [])

  const load = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
      if (res.status === 401) { setDenied(true); return }
      if (res.ok) { setDenied(false); setData(await res.json()) }
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { if (token) void load(token) }, [token, load])

  const call = async (method: 'POST' | 'PATCH', body: unknown) => {
    const res = await fetch('/api/admin/bootcamps', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    return { res, json: await res.json().catch(() => ({})) }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const { res, json } = await call('POST', { code: form.code, name: form.name, plan_to_grant: form.plan, ...(form.max ? { max_uses: Number(form.max) } : {}) })
    if (res.ok) { setMsg({ ok: true, text: `Created. Send this link: ${json.link}` }); setForm({ code: '', name: '', plan: 'basic', max: '' }); if (token) void load(token) }
    else setMsg({ ok: false, text: json.error === 'code_exists' ? 'That code is already used.' : json.message || json.error || 'Could not create the link.' })
  }
  const toggle = async (c: Cohort) => { const { res } = await call('PATCH', { code: c.code, active: !c.active }); if (res.ok && token) void load(token) }
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: 'Link copied.' }) } catch { setMsg({ ok: false, text: text }) } }

  if (token === undefined) return <main className="p-8 text-sm text-gray-700">Checking…</main>
  if (!token) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <p className="mt-2 text-sm text-gray-700">Sign in with your owner account, then come back to this page.</p>
        <Link href={`${SIGNIN_HREF}${SIGNIN_HREF.includes('?') ? '&' : '?'}next=%2Fadmin`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white">Sign in</Link>
      </main>
    )
  }
  if (denied) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <p className="mt-2 text-sm text-gray-700">This account is not on the owner list. Sign in with the owner account (the e-mail in ADMIN_EMAILS, or PAYSTACK_TEST_EMAIL if that is not set).</p>
      </main>
    )
  }

  const max = Math.max(1, ...(data?.signupsByDay ?? []).map((d) => d.n))
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-600">{data ? `Updated ${when(data.generated_at)}` : 'Loading…'}</p>
        </div>
        <button type="button" onClick={() => token && load(token)} disabled={loading} className="min-h-[44px] rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['People', n(data?.users?.total), `${n(data?.users?.last7)} this week, ${n(data?.users?.last30)} in 30 days`],
          ['Free', n(data?.users?.free), 'not published'],
          ['Basic / Pro', `${n(data?.users?.basic)} / ${n(data?.users?.pro)}`, 'plan right now (includes free cohort access)'],
          ['Cohort people', n(data?.users?.cohort), 'came through a cohort link'],
          ['Portfolios', n(data?.portfolios), 'created'],
          ['Revenue (30 days)', money(data?.payments?.revenue_30d_kobo), 'after refunds'],
          ['Revenue (recent)', money(data?.payments?.revenue_kobo), `${n(data?.payments?.count)} payments, ${n(data?.payments?.refunded_count)} refunded`],
          ['Refund requests', n(data?.refundRequests?.length ?? null), 'waiting for you'],
        ].map(([label, value, note]) => (
          <div key={label} className={card}><p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p><p className="mt-0.5 text-xs text-gray-600">{note}</p></div>
        ))}
      </section>

      <section aria-label="Sign-ups, last 30 days" className={card}>
        <h2 className="text-sm font-semibold text-gray-900">Sign-ups per day (30 days)</h2>
        <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label="Bar chart of sign-ups per day">
          {(data?.signupsByDay ?? []).map((d) => <div key={d.date} title={`${d.date}: ${d.n}`} className="flex-1 rounded-t bg-[#0A66C2]" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />)}
        </div>
      </section>

      <section aria-label="Cohort links" className={card}>
        <h2 className="text-sm font-semibold text-gray-900">Bootcamp, cohort and university links</h2>
        <p className="mt-1 text-sm text-gray-700">Everyone who signs up through a link gets 6 months of the plan. Create one, send the link, watch it convert.</p>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <label className="text-xs font-semibold text-gray-700 sm:col-span-1">Code (the link ending)<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="uniben-cs" className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm font-normal text-gray-900" /></label>
          <label className="text-xs font-semibold text-gray-700 sm:col-span-2">Name shown to students<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="UNIBEN Computer Science" className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm font-normal text-gray-900" /></label>
          <label className="text-xs font-semibold text-gray-700">Plan<select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm font-normal text-gray-900"><option value="basic">Basic (recommended)</option><option value="pro">Pro</option></select></label>
          <label className="text-xs font-semibold text-gray-700">Limit (optional)<input inputMode="numeric" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value.replace(/[^0-9]/g, '') })} placeholder="200" className="mt-1 block min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm font-normal text-gray-900" /></label>
          <div className="sm:col-span-5"><button type="submit" className="min-h-[44px] rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A]">Create link</button></div>
        </form>
        {msg && <p role="status" className={`mt-3 break-all text-sm ${msg.ok ? 'text-green-800' : 'text-red-800'}`}>{msg.text}</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px]"><thead><tr><th className={th}>Name</th><th className={th}>Plan</th><th className={th}>Signed up</th><th className={th}>Paid</th><th className={th}>Ending in 30 days</th><th className={th}>Link</th></tr></thead>
            <tbody>
              {(data?.cohorts ?? []).map((c) => (
                <tr key={c.code} className="border-t border-gray-100">
                  <td className={td}><strong>{c.name}</strong><br /><span className="text-xs text-gray-600">{c.code}{c.active ? '' : ' · switched off'}</span></td>
                  <td className={td}>{c.plan_to_grant}</td>
                  <td className={td}>{c.members}{c.max_uses ? ` of ${c.max_uses}` : ''}</td>
                  <td className={td}>{c.converted}{c.members ? ` (${Math.round((c.converted / c.members) * 100)}%)` : ''}</td>
                  <td className={td}>{c.ending_soon}</td>
                  <td className={td}>
                    <button type="button" onClick={() => copy(c.link)} className="min-h-[44px] rounded-full border border-gray-300 px-4 text-xs font-semibold hover:bg-gray-50">Copy link</button>{' '}
                    <button type="button" onClick={() => toggle(c)} className="min-h-[44px] rounded-full border border-gray-300 px-4 text-xs font-semibold hover:bg-gray-50">{c.active ? 'Switch off' : 'Switch on'}</button>
                  </td>
                </tr>
              ))}
              {(data?.cohorts ?? []).length === 0 && <tr><td className={td} colSpan={6}>No links yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {(data?.refundRequests ?? []).length > 0 && (
        <section aria-label="Refund requests" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">Refund requests waiting for you</h2>
          <p className="mt-1 text-sm text-gray-700">To approve, refund the transaction in the Paystack dashboard; the plan then ends by itself. To decline, reply to the person.</p>
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[560px]"><thead><tr><th className={th}>Account</th><th className={th}>Plan</th><th className={th}>Amount</th><th className={th}>Paid</th><th className={th}>Reference</th></tr></thead>
            <tbody>{data!.refundRequests!.map((r) => <tr key={r.reference} className="border-t border-amber-200"><td className={td}>{r.email}</td><td className={td}>{r.plan}</td><td className={td}>{money(r.amount_kobo)}</td><td className={td}>{when(r.paid_at)}</td><td className={`${td} break-all`}>{r.reference}</td></tr>)}</tbody></table></div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Recent sign-ups" className={card}>
          <h2 className="text-sm font-semibold text-gray-900">Latest sign-ups</h2>
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[420px]"><thead><tr><th className={th}>Account</th><th className={th}>Plan</th><th className={th}>When</th></tr></thead>
            <tbody>{(data?.recentSignups ?? []).map((u) => <tr key={u.email} className="border-t border-gray-100"><td className={`${td} break-all`}>{u.email}{u.bootcamp_code ? <span className="text-xs text-gray-600"> · {u.bootcamp_code}</span> : null}</td><td className={td}>{u.plan === 'unpublished' ? 'free' : u.plan}</td><td className={td}>{when(u.created_at)}</td></tr>)}</tbody></table></div>
        </section>
        <section aria-label="Recent payments" className={card}>
          <h2 className="text-sm font-semibold text-gray-900">Latest payments</h2>
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[420px]"><thead><tr><th className={th}>Account</th><th className={th}>Plan</th><th className={th}>Amount</th><th className={th}>When</th></tr></thead>
            <tbody>{(data?.payments?.recent ?? []).map((p, i) => <tr key={i} className="border-t border-gray-100"><td className={`${td} break-all`}>{p.email}</td><td className={td}>{p.plan}</td><td className={td}>{money(p.amount_kobo)}{p.refunded ? ' (refunded)' : ''}</td><td className={td}>{when(p.at)}</td></tr>)}</tbody></table></div>
        </section>
      </div>

      <p className="text-xs text-gray-600">Read-only except for the cohort links above. For anything else, use the Supabase SQL editor; there is deliberately no SQL box on this page.</p>
    </main>
  )
}
