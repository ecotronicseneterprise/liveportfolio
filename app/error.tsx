'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#fff',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: '50%',
        background: '#FEF2F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        marginBottom: 16,
      }}>⚠</div>
      <h2 style={{
        fontSize: 20, fontWeight: 700,
        color: '#0A0A0A', margin: '0 0 8px',
      }}>Something went wrong</h2>
      <p style={{
        color: '#6B7280', fontSize: 15,
        margin: '0 0 24px', maxWidth: 360,
        lineHeight: 1.6,
      }}>
        We hit an unexpected error. Your data is safe.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: '#0A66C2',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
