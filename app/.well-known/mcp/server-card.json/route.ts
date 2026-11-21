import { NextResponse } from 'next/server'
import { serverCard } from '@/lib/mcp/docs'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(serverCard(), { headers: { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' } })
}
