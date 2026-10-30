'use client'

import { useEffect, useRef } from 'react'

export default function ViewTracker({ portfolioId, receipt }: { portfolioId: string; receipt: { id: string; at: number; signature: string } }) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!portfolioId || sent.current === receipt.id) return

    let timer: number | null = null

    const send = () => {
      if (sent.current === receipt.id || document.visibilityState !== 'visible') return
      sent.current = receipt.id
      const body = JSON.stringify({ portfolio_id: portfolioId, event_type: 'portfolio_view', receipt, referrer: document.referrer || null })
      try {
        if (navigator.sendBeacon?.('/api/analytics/event', new Blob([body], { type: 'application/json' }))) return
      } catch { /* A rejected beacon still gets a keepalive attempt. */ }
      void fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).then((response) => {
        if (!response.ok && sent.current === receipt.id) sent.current = null
      }).catch(() => { if (sent.current === receipt.id) sent.current = null })
    }

    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
      if (sent.current === receipt.id || document.visibilityState !== 'visible') return
      timer = window.setTimeout(send, 1500)
    }

    const onVisibility = () => schedule()

    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', schedule)

    return () => {
      if (timer) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', schedule)
    }
  }, [portfolioId, receipt])

  return null
}
