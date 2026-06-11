import { NextResponse } from 'next/server'

export const revalidate = 86400

export async function GET() {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=NGN&to=USD',
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    const rate = data?.rates?.USD
    if (!rate) throw new Error('no rate')
    return NextResponse.json({ rate }, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
