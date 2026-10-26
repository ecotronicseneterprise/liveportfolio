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

  // Stacked and centred inside the middle 630px, so WhatsApp's square crop (and any other thumbnail crop) keeps all of it.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '22px',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0D1A2D 60%, #0A1628 100%)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={210} height={210} alt="" style={{ borderRadius: 46 }} />
        <div style={{ color: '#F0F6FF', fontSize: 66, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>LivePortfolio</div>
        <div style={{ color: '#F0F6FF', fontSize: 32, fontWeight: 600, lineHeight: 1.25, width: 480 }}>The fastest way to look hireable online.</div>
        <div style={{ color: '#58A6FF', fontSize: 26 }}>liveportfolio.site</div>
      </div>
    ),
    { ...size }
  )
}
