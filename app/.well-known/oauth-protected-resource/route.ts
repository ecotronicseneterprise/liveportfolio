import { NextResponse } from 'next/server'
import { protectedResourceMetadata } from '@/lib/mcp/metadata'

// Tells an assistant app where the sign-in server is. Public.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(protectedResourceMetadata(), { headers: { 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } })
}
