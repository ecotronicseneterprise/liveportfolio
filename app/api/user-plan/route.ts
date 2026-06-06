import { NextRequest, NextResponse } from 'next/server'
import { getUserPlan } from '@/lib/getUserPlan'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ plan: 'free' })
  }
  const plan = await getUserPlan(userId)
  return NextResponse.json({ plan })
}
