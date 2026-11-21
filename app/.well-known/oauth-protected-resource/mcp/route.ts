import { NextResponse } from 'next/server'
import { protectedResourceMetadata } from '@/lib/mcp/metadata'

// Path-suffixed form (/.well-known/oauth-protected-resource/mcp) that some clients try first.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(protectedResourceMetadata(), { headers: { 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } })
}
