// Pictures for the assistant tools: a hardened public-URL fetcher (SSRF-safe) and the re-encode + store step shared with the upload page.
// Never trusts a content-type or file name: the real type is sniffed, the picture is re-encoded with sharp (metadata stripped,
// dimensions and pixel count capped, no SVG) and stored under a new random name in our own bucket.
import dns from 'node:dns/promises'
import https from 'node:https'
import net from 'node:net'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { getSupabaseAdmin } from '@/lib/supabase'

export const MAX_BYTES = 8 * 1024 * 1024
export const MAX_PIXELS = 40_000_000 // decompression-bomb guard
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 3

export class ImageError extends Error {
  constructor(public code: 'bad_url' | 'blocked_address' | 'fetch_failed' | 'too_large' | 'bad_image' | 'storage_failed', message: string) { super(message) }
}

// ── address policy ───────────────────────────────────────────────────────────────────────────────────────────
function v4Private(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  )
}
/** True for any address a public image host must never resolve to: loopback, private, link-local, metadata, multicast, reserved. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip)
  if (kind === 4) return v4Private(ip)
  if (kind === 6) {
    const l = ip.toLowerCase()
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l)
    if (mapped) return v4Private(mapped[1])
    const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(l)
    if (hexMapped) {
      const hi = parseInt(hexMapped[1], 16), lo = parseInt(hexMapped[2], 16)
      return v4Private(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return l === '::' || l === '::1' || l.startsWith('fe8') || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb') || /^f[cd]/.test(l) || l.startsWith('ff') || l.startsWith('64:ff9b') || l.startsWith('100:') || l.startsWith('2001:db8')
  }
  return true // not an IP at all: refuse
}

export function checkImageUrl(raw: string): URL {
  let u: URL
  try { u = new URL(raw) } catch { throw new ImageError('bad_url', 'That is not a valid link.') }
  if (u.protocol !== 'https:') throw new ImageError('bad_url', 'Only https links are accepted.')
  if (u.username || u.password) throw new ImageError('bad_url', 'Links with a username or password are not accepted.')
  if (u.port && u.port !== '443') throw new ImageError('bad_url', 'Only the standard https port is accepted.')
  if (u.hostname === 'localhost' || u.hostname.endsWith('.localhost') || u.hostname.endsWith('.internal') || u.hostname.endsWith('.local')) throw new ImageError('blocked_address', 'That address is not allowed.')
  if (raw.length > 2000) throw new ImageError('bad_url', 'That link is too long.')
  return u
}

/** One GET to a vetted address. The socket connects to the IP we validated (pinned), so DNS cannot change between check and use. */
function getPinned(u: URL, ip: string, family: 4 | 6): Promise<{ status: number; location?: string; body?: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: u.hostname, servername: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET', headers: { host: u.hostname, accept: 'image/jpeg,image/png,image/webp', 'user-agent': 'LivePortfolio-image-fetch/1.0' }, timeout: TIMEOUT_MS,
        lookup: (_h, _o, cb) => (cb as (e: Error | null, a: string, f: number) => void)(null, ip, family) },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400) { res.resume(); resolve({ status, location: String(res.headers.location ?? '') }); return }
        if (status !== 200) { res.resume(); resolve({ status }); return }
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (c: Buffer) => { size += c.length; if (size > MAX_BYTES) { req.destroy(new ImageError('too_large', 'That picture is too large (limit 8 MB).')); return } chunks.push(c) })
        res.on('end', () => resolve({ status, body: Buffer.concat(chunks) }))
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new ImageError('fetch_failed', 'The picture took too long to download.')))
    req.on('error', (e) => reject(e instanceof ImageError ? e : new ImageError('fetch_failed', 'The picture could not be downloaded.')))
    req.end()
  })
}

export async function fetchPublicImage(raw: string, resolver: (h: string) => Promise<Array<{ address: string; family: number }>> = (h) => dns.lookup(h, { all: true })): Promise<Buffer> {
  let u = checkImageUrl(raw)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let addrs: Array<{ address: string; family: number }>
    try { addrs = net.isIP(u.hostname) ? [{ address: u.hostname, family: net.isIP(u.hostname) }] : await resolver(u.hostname) } catch { throw new ImageError('fetch_failed', 'That address could not be found.') }
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new ImageError('blocked_address', 'That address is not allowed.')
    const r = await getPinned(u, addrs[0].address, addrs[0].family === 6 ? 6 : 4)
    if (r.status >= 300 && r.status < 400) {
      if (!r.location) throw new ImageError('fetch_failed', 'The picture link redirects nowhere.')
      u = checkImageUrl(new URL(r.location, u).toString()) // every hop is validated again
      continue
    }
    if (r.status !== 200 || !r.body) throw new ImageError('fetch_failed', 'The picture could not be downloaded.')
    return r.body
  }
  throw new ImageError('fetch_failed', 'Too many redirects.')
}

// ── sniff, re-encode, store ──────────────────────────────────────────────────────────────────────────────────
export function sniffType(b: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  return null
}

export async function normalizeImage(input: Buffer, maxSide = 1600): Promise<Buffer> {
  if (input.length > MAX_BYTES) throw new ImageError('too_large', 'That picture is too large (limit 8 MB).')
  if (!sniffType(input)) throw new ImageError('bad_image', 'Only JPEG, PNG or WebP pictures are accepted.')
  try {
    return await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
      .rotate() // apply the camera orientation, then the metadata is dropped on output
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  } catch {
    throw new ImageError('bad_image', 'That file could not be read as a picture.')
  }
}

export type ImageTarget = { kind: 'profile' } | { kind: 'project'; index: number }

/** Stores a normalized JPEG in our own bucket under a new random name starting with the user id (account deletion removes by that prefix). */
export async function storeImage(userId: string, target: ImageTarget, jpeg: Buffer): Promise<string> {
  const bucket = target.kind === 'profile' ? 'avatars' : 'project-images'
  const name = `${userId}-${target.kind === 'profile' ? 'p' : target.index}-${crypto.randomBytes(6).toString('hex')}.jpg`
  const admin = getSupabaseAdmin()
  const { error } = await admin.storage.from(bucket).upload(name, jpeg, { upsert: false, contentType: 'image/jpeg' })
  if (error) throw new ImageError('storage_failed', 'The picture could not be stored.')
  return admin.storage.from(bucket).getPublicUrl(name).data.publicUrl
}

// ── one-time upload links (a bearer credential: random, hashed at rest, short-lived, single use, bound to a user and a target) ──
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex')
export const newUploadToken = () => crypto.randomBytes(32).toString('base64url')
export const targetToString = (t: ImageTarget) => (t.kind === 'profile' ? 'profile' : `project:${t.index}`)
export function targetFromString(s: string): ImageTarget | null {
  if (s === 'profile') return { kind: 'profile' }
  const m = /^project:(\d{1,2})$/.exec(s)
  return m ? { kind: 'project', index: Number(m[1]) } : null
}
