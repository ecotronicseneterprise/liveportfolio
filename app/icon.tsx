import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A66C2',
        }}
      >
        {/* Head */}
        <div
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'white',
            top: 6,
            left: 10,
          }}
        />
        {/* Shoulders arc — two overlapping divs forming a U shape */}
        <div
          style={{
            position: 'absolute',
            width: 20,
            height: 12,
            borderRadius: '0 0 10px 10px',
            background: 'white',
            bottom: 4,
            left: 6,
          }}
        />
      </div>
    ),
    { ...size }
  )
}
