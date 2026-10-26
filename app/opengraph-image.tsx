import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'LivePortfolio: the fastest way to look hireable online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The share card for the home page (WhatsApp, LinkedIn, X, Slack...): the real LivePortfolio logo, the name and the line.
export default async function Image() {
  const png = await fetch(new URL('../public/logo-512.png', import.meta.url)).then((r) => r.arrayBuffer())
  let bin = ''
  const bytes = new Uint8Array(png)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const logo = `data:image/png;base64,${btoa(bin)}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 96px',
          gap: '64px',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0D1A2D 60%, #0A1628 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={300} height={300} alt="" style={{ borderRadius: 64 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ color: '#F0F6FF', fontSize: 80, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>LivePortfolio</div>
          <div style={{ color: '#F0F6FF', fontSize: 38, fontWeight: 600, lineHeight: 1.2, maxWidth: 640 }}>The fastest way to look hireable online.</div>
          <div style={{ color: '#58A6FF', fontSize: 28 }}>liveportfolio.site</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
