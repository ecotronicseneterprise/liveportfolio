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
          borderRadius: 7,
        }}
      >
        {/* User silhouette: head + shoulders */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="10" r="5" fill="white" />
          <path
            d="M4 26c0-5.52 4.48-10 10-10s10 4.48 10 10"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
