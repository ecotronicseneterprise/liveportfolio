import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getIpInfo } from '@/lib/ipinfo'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() || realIp || '127.0.0.1'

    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)
    const supabaseAdmin = getSupabaseAdmin()

    const { country } = await getIpInfo(ip, ipHash, supabaseAdmin)

    const region: 'NG' | 'INTL' = country === 'Nigeria' ? 'NG' : 'INTL'

    return NextResponse.json({ region, country })
  } catch {
    return NextResponse.json({ region: 'NG', country: null })
  }
}
