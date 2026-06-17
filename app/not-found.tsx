import Link from 'next/link'

export default function NotFound() {
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
        fontSize: 48,
        fontWeight: 800,
        color: '#0A66C2',
        marginBottom: 8,
      }}>404</div>
      <h2 style={{
        fontSize: 20, fontWeight: 700,
        color: '#0A0A0A', margin: '0 0 8px',
      }}>Page not found</h2>
      <p style={{
        color: '#6B7280', fontSize: 15,
        margin: '0 0 24px', maxWidth: 360,
        lineHeight: 1.6,
      }}>
        The page you are looking for does not exist
        or may have been moved.
      </p>
      <Link
        href="/"
        style={{
          padding: '10px 24px',
          background: '#0A66C2',
          color: '#fff',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Go home
      </Link>
    </div>
  )
}
