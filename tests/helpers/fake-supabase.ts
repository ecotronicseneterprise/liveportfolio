// Minimal in-memory stand-in for the parts of the Supabase query builder the routes use.
// Supports: select (with {count:'exact', head:true}), insert, update, delete, eq, is, in, gt, gte, lt, order, limit, maybeSingle,
// update(...).select() returning rows, unique violations on listed columns, and one-shot failure injection.
type Row = Record<string, any>

export function createFakeDb(unique: Record<string, string[]> = { users: ['id', 'slug', 'email'], payments: ['ls_order_id'] }) {
  const db: Record<string, Row[]> = {}
  const failures: Array<{ table: string; op: string; sticky?: boolean; code?: string }> = []
  const missing = new Set<string>() // tables that "do not exist" (every call errors)
  let seq = 0

  const take = (table: string, op: string) => {
    const i = failures.findIndex((f) => f.table === table && f.op === op)
    if (i === -1) return null
    const f = failures[i]
    if (!f.sticky) failures.splice(i, 1)
    return { message: `injected ${table}.${op} failure`, code: f.code }
  }

  function from(table: string) {
    db[table] ??= []
    let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
    let payload: Row = {}
    let head = false
    let wantCount = false
    let returning = false
    const filters: Array<(r: Row) => boolean> = []
    let orderCol: string | null = null
    let max: number | null = null

    const run = (single: boolean) => {
      if (missing.has(table)) return { data: null, error: { message: `relation "${table}" does not exist`, code: '42P01' }, count: null }
      const err = take(table, op)
      if (err) return { data: null, error: err, count: null }
      const rows = db[table]
      const match = (r: Row) => filters.every((f) => f(r))
      if (op === 'insert') {
        for (const col of unique[table] ?? []) {
          if (payload[col] !== undefined && rows.some((r) => r[col] === payload[col])) {
            return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint "${table}_${col}_key"` }, count: null }
          }
        }
        const row = { id: payload.id ?? `id-${++seq}`, at: new Date().toISOString(), ...payload }
        rows.push(row)
        // insert(...).select().single() returns the inserted row, like PostgREST
        return { data: returning ? (single ? { ...row } : [{ ...row }]) : null, error: null, count: null }
      }
      if (op === 'upsert') {
        const col = upsertOpts.onConflict ?? 'id'
        const hit = rows.find((r) => payload[col] !== undefined && r[col] === payload[col])
        if (hit) { if (!upsertOpts.ignoreDuplicates) Object.assign(hit, payload); return { data: null, error: null, count: null } }
        rows.push({ id: payload.id ?? `id-${++seq}`, at: new Date().toISOString(), ...payload })
        return { data: null, error: null, count: null }
      }
      if (op === 'update') {
        const hit = rows.filter(match)
        for (const r of hit) Object.assign(r, payload)
        return { data: returning ? hit.map((r) => ({ ...r })) : null, error: null, count: null }
      }
      if (op === 'delete') {
        db[table] = rows.filter((r) => !match(r))
        return { data: null, error: null, count: null }
      }
      let out = rows.filter(match)
      if (orderCol) out = [...out].sort((a, b) => String(b[orderCol!]).localeCompare(String(a[orderCol!])))
      if (max !== null) out = out.slice(0, max)
      const count = wantCount ? rows.filter(match).length : null
      if (head) return { data: null, error: null, count }
      return { data: single ? (out[0] ? { ...out[0] } : null) : out.map((r) => ({ ...r })), error: null, count }
    }

    const q: any = {
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => {
        if (op === 'update' || op === 'insert') returning = true
        else { op = 'select'; head = !!o?.head; wantCount = !!o?.count }
        return q
      },
      insert: (row: Row) => { op = 'insert'; payload = row; return q },
      upsert: (row: Row, o?: { onConflict?: string; ignoreDuplicates?: boolean }) => { op = 'upsert'; payload = row; upsertOpts = o ?? {}; return q },
      not: (c: string, operator: string, v: unknown) => { if (operator === 'is' && v === null) filters.push((r) => r[c] != null); return q },
      lte: (c: string, v: string) => { filters.push((r) => String(r[c]) <= v); return q },
      update: (p: Row) => { op = 'update'; payload = p; return q },
      delete: () => { op = 'delete'; return q },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q },
      neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return q },
      is: (c: string, v: unknown) => { filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return q },
      in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q },
      gt: (c: string, v: string) => { filters.push((r) => String(r[c]) > v); return q },
      gte: (c: string, v: string) => { filters.push((r) => String(r[c]) >= v); return q },
      lt: (c: string, v: string) => { filters.push((r) => String(r[c]) < v); return q },
      order: (c: string) => { orderCol = c; return q },
      limit: (n: number) => { max = n; return q },
      maybeSingle: async () => run(true),
      single: async () => run(true),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run(false)).then(res, rej),
    }
    return q
  }

  return { db, failures, missing, admin: { from } }
}
