import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const alt = 'Portfolio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabaseAdmin
    .from('users')
    .select('portfolios(content)')
    .eq('slug', slug.toLowerCase())
    .neq('plan', 'unpublished')
    .single()

  const rawPortfolio = data?.portfolios
  const portfolio = (Array.isArray(rawPortfolio)
    ? (rawPortfolio as unknown as { content: { name: string; role: string; headline: string } }[])[0]
    : rawPortfolio as unknown as { content: { name: string; role: string; headline: string } } | null) ?? null

  const name = portfolio?.content?.name ?? 'Portfolio'
  const role = portfolio?.content?.role ?? ''
  const headline = portfolio?.content?.headline ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0D1A2D 60%, #0A1628 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: '#0A66C2',
          }}
        />

        {/* Site label */}
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '80px',
            color: '#8B949E',
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          liveportfolio.site
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          {role ? (
            <div style={{ color: '#0A66C2', fontSize: '16px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {role}
            </div>
          ) : null}

          <div style={{ color: '#F0F6FF', fontSize: '64px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            {name}
          </div>

          {headline ? (
            <div style={{ color: '#8B949E', fontSize: '22px', lineHeight: 1.5, maxWidth: '700px' }}>
              {headline.length > 100 ? headline.slice(0, 100) + '…' : headline}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  )
}
