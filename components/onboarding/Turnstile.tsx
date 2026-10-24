'use client'

import { useEffect, useRef } from 'react'
import { turnstileSiteKey } from '@/lib/onboarding/captcha'

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string
      reset(id?: string): void
      remove(id?: string): void
    }
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('turnstile')))
      return
    }
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile'))
    document.head.appendChild(s)
  })
}

/**
 * Cloudflare Turnstile widget. Renders nothing (and never loads Cloudflare's script) when no site key is configured.
 * Tokens are single-use: bump `resetSignal` after every request that consumed one.
 */
export default function Turnstile({ onToken, resetSignal = 0 }: { onToken: (token: string | null) => void; resetSignal?: number }) {
  const siteKey = turnstileSiteKey()
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey || !box.current) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (t: string) => onToken(t),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        })
      })
      .catch(() => onToken(null))
    return () => {
      cancelled = true
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  useEffect(() => {
    if (resetSignal && widget.current && window.turnstile) {
      onToken(null)
      window.turnstile.reset(widget.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  if (!siteKey) return null
  return <div ref={box} className="my-3" />
}
