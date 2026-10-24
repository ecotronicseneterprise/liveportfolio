// The two Paystack calls the one-time checkout needs. Server only (uses the secret key). Never logs the key, the e-mail or card data.
// Initialize deliberately sends NO `plan` (a plan overrides the amount and creates a card subscription) and NO `channels`
// (so Checkout offers every channel enabled on the account).
const BASE = 'https://api.paystack.co'
const TIMEOUT_MS = 8000

async function call(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<{ status: number; body: unknown } | null> {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch {
    return null // network failure or timeout
  } finally {
    clearTimeout(timer)
  }
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null)

export type InitResult = { ok: true; authorizationUrl: string; accessCode: string } | { ok: false }

export async function initializeTransaction(args: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}): Promise<InitResult> {
  const r = await call('/transaction/initialize', {
    method: 'POST',
    body: { email: args.email, amount: args.amountKobo, currency: 'NGN', reference: args.reference, callback_url: args.callbackUrl, metadata: args.metadata },
  })
  const b = obj(r?.body)
  const d = obj(b?.data)
  if (!r || r.status !== 200 || b?.status !== true || typeof d?.authorization_url !== 'string' || typeof d?.access_code !== 'string') return { ok: false }
  return { ok: true, authorizationUrl: d.authorization_url, accessCode: d.access_code }
}

export type VerifyResult = { ok: true; status: string; amount: number; currency: string; reference: string } | { ok: false }

/** `data.status` is the payment's state; the top-level `status` only says the API call worked. */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const r = await call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' })
  const b = obj(r?.body)
  const d = obj(b?.data)
  if (!r || r.status !== 200 || b?.status !== true || !d) return { ok: false }
  if (typeof d.status !== 'string' || typeof d.amount !== 'number' || !Number.isFinite(d.amount) || typeof d.currency !== 'string' || typeof d.reference !== 'string') return { ok: false }
  return { ok: true, status: d.status, amount: d.amount, currency: d.currency, reference: d.reference }
}
