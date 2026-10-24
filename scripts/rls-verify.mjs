#!/usr/bin/env node
// Verifies the "close browser writes" fix against a RUNNING app + Supabase project.
//
//   EXPECT=open     before the migration: proves the test can see the hole (direct browser writes SUCCEED)
//   EXPECT=blocked  after the migration:  every direct browser write must FAIL, server routes must still work
//
// SAFETY
//  - It creates its own throwaway users (rls-test-<random>@example.com) with the admin API and only ever touches those
//    rows. It never reads, lists or modifies real users. Everything is deleted in `finally`.
//  - Even so, it runs against whatever project the env points at, so you must type that project's ref to confirm.
//
// Usage (PowerShell):
//   $env:SUPABASE_URL="https://<ref>.supabase.co"; $env:SUPABASE_ANON_KEY="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."
//   $env:APP_URL="https://staging.example.com"; $env:EXPECT="blocked"; $env:RLS_TEST_CONFIRM="<ref>"
//   node scripts/rls-verify.mjs
//
// Needs Node 18+ (global fetch) and @supabase/supabase-js (already a dependency).

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = (k, alt) => process.env[k] ?? (alt ? process.env[alt] : undefined)
const URL_ = env('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
const ANON = env('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY')
const APP = (env('APP_URL') || '').replace(/\/$/, '')
const EXPECT = (env('EXPECT') || 'blocked').toLowerCase()

function die(msg) { console.error('ABORT: ' + msg); process.exit(2) }
if (!URL_ || !ANON || !SERVICE || !APP) die('set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and APP_URL')
if (!['open', 'blocked'].includes(EXPECT)) die('EXPECT must be "open" or "blocked"')
const ref = new globalThis.URL(URL_).hostname.split('.')[0]
if (process.env.RLS_TEST_CONFIRM !== ref) die(`this will create throwaway users in Supabase project "${ref}". Set RLS_TEST_CONFIRM=${ref} to proceed.`)

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const rand = () => crypto.randomBytes(4).toString('hex')
const results = []
const record = (name, expected, actual, pass, note = '') => {
  results.push({ name, expected, actual, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(62)} expected ${expected.padEnd(12)} got ${actual}${note ? '  (' + note + ')' : ''}`)
}

const created = { users: [], rows: [] }
async function throwawayUser(label) {
  const email = `rls-test-${label}-${rand()}@example.com`
  const password = `Tmp-${rand()}-${rand()}!`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('createUser failed: ' + error.message)
  created.users.push(data.user.id)
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s, error: se } = await client.auth.signInWithPassword({ email, password })
  if (se) throw new Error('signIn failed: ' + se.message)
  return { id: data.user.id, email, client, token: s.session.access_token }
}

const api = async (method, path, token, body) => {
  const res = await fetch(`${APP}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch { /* empty */ }
  return { status: res.status, json }
}
const dbRow = async (table, col, val) => (await admin.from(table).select('*').eq(col, val).maybeSingle()).data

try {
  console.log(`\nProject ${ref} · app ${APP} · EXPECT=${EXPECT}\n`)
  const A = await throwawayUser('a')
  const B = await throwawayUser('b')
  const slugA = `rlstest-a-${rand()}`

  // ── server routes (must work in BOTH modes) ───────────────────────────────────────────────────────────────
  console.log('— server routes —')
  let r = await api('POST', '/api/account/profile', A.token, { slug: slugA, plan: 'pro', published_at: new Date().toISOString(), email: 'evil@example.com' })
  record('signup: POST /api/account/profile creates the row', '201', String(r.status), r.status === 201)
  const rowA = await dbRow('users', 'id', A.id)
  record('signup: plan forced to "unpublished" despite body plan=pro', 'unpublished', String(rowA?.plan), rowA?.plan === 'unpublished')
  record('signup: published_at stays null', 'null', String(rowA?.published_at), rowA?.published_at == null)
  record('signup: e-mail comes from the token, not the body', A.email, String(rowA?.email), rowA?.email === A.email.toLowerCase())

  r = await api('POST', '/api/account/profile', B.token, { slug: slugA })
  record('signup: duplicate slug is rejected', '409', String(r.status), r.status === 409)
  r = await api('POST', '/api/account/profile', B.token, { slug: 'admin' })
  record('signup: reserved slug is rejected', '400', String(r.status), r.status === 400)
  r = await api('POST', '/api/account/profile', B.token, { slug: 'Bad Slug!' })
  record('signup: malformed slug is rejected', '400', String(r.status), r.status === 400)
  r = await api('POST', '/api/account/profile', null, { slug: `rlstest-x-${rand()}` })
  record('signup: no token is rejected', '401', String(r.status), r.status === 401)
  record('signup: rejected attempts created no row for B', 'none', (await dbRow('users', 'id', B.id)) ? 'row exists' : 'none', !(await dbRow('users', 'id', B.id)))

  // a portfolio, inserted with the service role exactly like /api/generate does
  const { data: pf, error: pfe } = await admin.from('portfolios').insert({
    user_id: A.id, template: 'minimal', content: { name: 'RLS Test', role: 'Tester', email: A.email, skills: [], projects: [], experience: [] },
  }).select('id').single()
  if (pfe) throw new Error('portfolio insert failed: ' + pfe.message)
  created.rows.push(['portfolios', pf.id])

  r = await api('PATCH', '/api/update', A.token, { template: 'bold' })
  record('edit: template switch via /api/update works', '200', String(r.status), r.status === 200)
  r = await api('PATCH', '/api/update', A.token, { content: { name: 'Hacked Via API' } })
  record('edit: content edit by an unpaid user is refused (403)', '403', String(r.status), r.status === 403)

  // ── direct writes with the browser (anon key + user JWT): the hole ────────────────────────────────────────
  console.log('\n— direct browser writes (expected to ' + (EXPECT === 'blocked' ? 'FAIL' : 'SUCCEED, proving the hole') + ') —')
  const want = EXPECT === 'blocked' ? 'blocked' : 'succeeds'
  const verdict = (changed, error) => (changed ? 'succeeds' : 'blocked' + (error ? '' : ' (0 rows)'))

  let e = (await A.client.from('users').update({ plan: 'pro' }).eq('id', A.id)).error
  let after = await dbRow('users', 'id', A.id)
  record('browser UPDATE users.plan = pro', want, verdict(after.plan === 'pro', e), verdict(after.plan === 'pro', e).startsWith(want), e ? e.message.slice(0, 50) : '')
  await admin.from('users').update({ plan: 'unpublished' }).eq('id', A.id) // undo

  e = (await A.client.from('users').update({ plan_expires_at: '2099-01-01T00:00:00Z', published_at: new Date().toISOString() }).eq('id', A.id)).error
  after = await dbRow('users', 'id', A.id)
  const changedExp = !!after.plan_expires_at || !!after.published_at
  record('browser UPDATE users.plan_expires_at / published_at', want, verdict(changedExp, e), verdict(changedExp, e).startsWith(want), e ? e.message.slice(0, 50) : '')
  await admin.from('users').update({ plan_expires_at: null, published_at: null }).eq('id', A.id)

  const newSlug = `rlstest-hijack-${rand()}`
  e = (await A.client.from('users').update({ slug: newSlug }).eq('id', A.id)).error
  after = await dbRow('users', 'id', A.id)
  record('browser UPDATE users.slug', want, verdict(after.slug === newSlug, e), verdict(after.slug === newSlug, e).startsWith(want), e ? e.message.slice(0, 50) : '')
  await admin.from('users').update({ slug: slugA }).eq('id', A.id)

  e = (await A.client.from('portfolios').update({ content: { name: 'Hacked Direct' }, template: 'developer' }).eq('id', pf.id)).error
  const pAfter = await dbRow('portfolios', 'id', pf.id)
  const pChanged = pAfter.content?.name === 'Hacked Direct' || pAfter.template === 'developer'
  record('browser UPDATE portfolios.content / template', want, verdict(pChanged, e), verdict(pChanged, e).startsWith(want), e ? e.message.slice(0, 50) : '')
  await admin.from('portfolios').update({ content: { name: 'RLS Test' }, template: 'minimal' }).eq('id', pf.id)

  e = (await B.client.from('users').insert({ id: B.id, email: B.email.toLowerCase(), slug: `rlstest-b-${rand()}`, plan: 'pro' })).error
  const rowB = await dbRow('users', 'id', B.id)
  record('browser INSERT users row with plan = pro', want, verdict(!!rowB, e), verdict(!!rowB, e).startsWith(want), e ? e.message.slice(0, 50) : '')
  if (rowB) await admin.from('users').delete().eq('id', B.id)

  e = (await A.client.from('portfolios').delete().eq('id', pf.id)).error
  const stillThere = await dbRow('portfolios', 'id', pf.id)
  record('browser DELETE portfolios', want, verdict(!stillThere, e), verdict(!stillThere, e).startsWith(want), e ? e.message.slice(0, 50) : '')
  if (!stillThere) {
    const { data: again } = await admin.from('portfolios').insert({ user_id: A.id, template: 'minimal', content: { name: 'RLS Test' } }).select('id').single()
    if (again) { pf.id = again.id; created.rows.push(['portfolios', again.id]) }
  }

  // ── reads must keep working in both modes ─────────────────────────────────────────────────────────────────
  console.log('\n— reads (must keep working) —')
  const ru = await A.client.from('users').select('id, slug, plan').eq('id', A.id).maybeSingle()
  record('browser SELECT own users row', 'ok', ru.data ? 'ok' : 'fail', !!ru.data, ru.error?.message)
  const rp = await A.client.from('portfolios').select('id, template').eq('user_id', A.id).maybeSingle()
  record('browser SELECT own portfolio', 'ok', rp.data ? 'ok' : 'fail', !!rp.data, rp.error?.message)
  const rOther = await B.client.from('portfolios').select('id').eq('user_id', A.id)
  record('browser cannot SELECT another user\'s portfolio', '0 rows', String(rOther.data?.length ?? 0) + ' rows', (rOther.data?.length ?? 0) === 0)

  // ── informational: the SECURITY DEFINER counter ───────────────────────────────────────────────────────────
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const before = (await dbRow('portfolios', 'id', pf.id)).view_count ?? 0
  const rpc = await anon.rpc('increment_view_count', { portfolio_id: pf.id })
  const afterViews = (await dbRow('portfolios', 'id', pf.id)).view_count ?? 0
  console.log(`\nINFO  anonymous rpc increment_view_count: ${rpc.error ? 'blocked (' + rpc.error.message.slice(0, 40) + ')' : afterViews > before ? 'CALLABLE by anyone (see 20261024120100_revoke_view_count_rpc.sql)' : 'no effect'}`)

  // ── delete via the server route ──────────────────────────────────────────────────────────────────────────
  console.log('\n— delete —')
  r = await api('DELETE', '/api/delete-account', A.token)
  record('delete: DELETE /api/delete-account succeeds', '200', String(r.status), r.status === 200)
  record('delete: users row gone', 'none', (await dbRow('users', 'id', A.id)) ? 'exists' : 'none', !(await dbRow('users', 'id', A.id)))
  record('delete: portfolio gone', 'none', (await dbRow('portfolios', 'user_id', A.id)) ? 'exists' : 'none', !(await dbRow('portfolios', 'user_id', A.id)))
} catch (err) {
  console.error('\nERROR: ' + (err instanceof Error ? err.message : String(err)))
  results.push({ name: 'script error', expected: 'none', actual: 'error', pass: false })
} finally {
  for (const [table, id] of created.rows) await admin.from(table).delete().eq('id', id).then(() => {}, () => {})
  for (const id of created.users) {
    await admin.from('portfolios').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('users').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).then(() => {}, () => {})
  }
  const failed = results.filter((x) => !x.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed (EXPECT=${EXPECT}); throwaway users removed.`)
  if (failed.length) {
    console.log('FAILED:\n  ' + failed.map((x) => x.name).join('\n  '))
    process.exitCode = 1
  }
}
