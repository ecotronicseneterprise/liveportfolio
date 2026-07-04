import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'LivePortfolio — The fastest way to look hireable online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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

        {/* Logo wordmark */}
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0A66C2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white' }} />
          </div>
          <span style={{ color: '#F0F6FF', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            liveportfolio.site
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '800px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0A66C2' }} />
            <span style={{ color: '#0A66C2', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Portfolio Builder
            </span>
          </div>

          <div style={{ color: '#F0F6FF', fontSize: '56px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            The fastest way to look hireable online.
          </div>

          <div style={{ color: '#8B949E', fontSize: '22px', lineHeight: 1.5 }}>
            Upload your CV. We write your story. Publish in minutes.
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
