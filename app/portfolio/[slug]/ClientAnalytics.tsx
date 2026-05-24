'use client'

import { useEffect } from 'react'

export default function ClientAnalytics({ slug }: { slug: string }) {
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {}) // fire and forget
  }, [slug])

  return null
}
