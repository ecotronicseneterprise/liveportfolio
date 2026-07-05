import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'What Is a Portfolio?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '80px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        }}
      >
        <div style={{
          fontSize: '18px',
          color: '#60A5FA',
          marginBottom: '24px',
          fontFamily: 'sans-serif',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          LivePortfolio Guide
        </div>
        <div style={{
          fontSize: '52px',
          fontWeight: 800,
          color: 'white',
          fontFamily: 'sans-serif',
          lineHeight: 1.15,
          maxWidth: '900px',
        }}>
          What Is a Portfolio? The Complete Guide for Professionals
        </div>
        <div style={{
          marginTop: '32px',
          fontSize: '20px',
          color: '#94A3B8',
          fontFamily: 'sans-serif',
        }}>
          liveportfolio.site/what-is-a-portfolio
        </div>
      </div>
    ),
    { ...size }
  )
}
