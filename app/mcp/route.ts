import { NextRequest, NextResponse } from 'next/server'
import { authenticateMcp } from '@/lib/mcp/auth'
import { handleMessage } from '@/lib/mcp/rpc'

// The MCP endpoint (Streamable HTTP, stateless). Accepts ONLY tokens issued to an assistant app (client_id claim); browser sign-in
// tokens are refused here, and assistant tokens are refused on every /api route (middleware.ts), so the two never cross.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site').replace(/\/$/, '')
const RESOURCE_METADATA = `${ORIGIN}/.well-known/oauth-protected-resource`
const MAX_BODY = 256 * 1024

// Browsers call this endpoint cross-origin only from the assistant products' own sites; non-browser clients send no Origin.
const ALLOWED_ORIGINS = new Set(['https://claude.ai', 'https://chatgpt.com', 'https://chat.openai.com', 'https://www.claude.ai'])
const originOk = (req: NextRequest) => {
  const o = req.headers.get('origin')
  return !o || ALLOWED_ORIGINS.has(o)
}
const cors = (req: NextRequest): Record<string, string> => {
  const o = req.headers.get('origin')
  return o && ALLOWED_ORIGINS.has(o) ? { 'access-control-allow-origin': o, vary: 'origin', 'access-control-expose-headers': 'WWW-Authenticate' } : {}
}

export async function OPTIONS(req: NextRequest) {
  if (!originOk(req)) return new NextResponse(null, { status: 403 })
  return new NextResponse(null, { status: 204, headers: { ...cors(req), 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id', 'access-control-max-age': '600' } })
}

export async function GET() {
  // no server-initiated stream: this server is stateless
  return new NextResponse(null, { status: 405, headers: { allow: 'POST, OPTIONS' } })
}

export async function POST(req: NextRequest) {
  if (!originOk(req)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 })
  const headers = cors(req)

  const auth = await authenticateMcp(req.headers.get('authorization'))
  if (!auth.ok) {
    const h: Record<string, string> = { ...headers }
    if (auth.status === 401) h['WWW-Authenticate'] = `Bearer resource_metadata="${RESOURCE_METADATA}"`
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: auth.message, data: { code: auth.code } } }, { status: auth.status, headers: h })
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request too large' } }, { status: 413, headers })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers }) }

  const messages = Array.isArray(body) ? body : [body]
  if (messages.length === 0 || messages.length > 20) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }, { status: 400, headers })
  const out = (await Promise.all(messages.map((m) => handleMessage((m ?? {}) as never, auth.ctx)))).filter((r) => r !== null)
  if (out.length === 0) return new NextResponse(null, { status: 202, headers })
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers })
}
