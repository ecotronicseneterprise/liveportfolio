// Token isolation. A token Supabase issues to an AI assistant (OAuth client) is a normal "authenticated" user token that ALSO carries
// a `client_id` claim. A browser sign-in token (email, Google) never does. This file is edge-safe (no Node APIs) because the
// middleware uses it to refuse assistant tokens on every /api route, so an assistant can never reach billing, account deletion or
// any other browser route. Only /mcp accepts them.
//
// Decoding here does NOT verify the signature. That is fine for REFUSING (a forged client_id only gets the forger refused) and for
// routing. Anything that GRANTS access verifies the token with Supabase first (lib/mcp/auth.ts).

export function bearerToken(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec((header ?? '').trim())
  return m ? m[1] : null
}

export interface TokenClaims {
  sub?: string
  aud?: string | string[]
  client_id?: string
  exp?: number
  [k: string]: unknown
}

export function decodeClaims(token: string): TokenClaims | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? (v as TokenClaims) : null
  } catch {
    return null
  }
}

/** True when the token was issued to an OAuth client (an assistant), not to a person signing in. */
export function isAssistantToken(token: string | null | undefined): boolean {
  if (!token) return false
  const c = decodeClaims(token)
  return !!c && typeof c.client_id === 'string' && c.client_id.length > 0
}
