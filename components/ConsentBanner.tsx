'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, REOPEN_EVENT, readConsent, revokeAnalytics, saveConsent, shouldShowBanner, type Consent } from '@/lib/consent'

const BTN = 'min-h-[44px] min-w-[96px] px-5 rounded-full border border-gray-900 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'

/** The visible banner. Both choices have identical styling on purpose: rejecting is exactly as easy as accepting. */
export function BannerView({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-300 bg-white px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p id="consent-title" className="text-sm font-semibold text-gray-900">Can we count visits with Google Analytics?</p>
          <p id="consent-text" className="mt-1 text-sm text-gray-700">
            It sets cookies and sends your IP address and the pages you view to Google. If you say no, nothing is sent and the site works the same.{' '}
            <Link href="/privacy#cookies" className="font-medium text-[#0A66C2] underline">Details</Link>
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className={BTN} onClick={onReject}>Reject</button>
          <button type="button" className={BTN} onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  )
}

/** Renders nothing on the server and on first paint; decides in the browser after reading the stored choice. */
export default function ConsentBanner() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)
  const [reopened, setReopened] = useState(false)
  const pathname = usePathname()
  const first = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => { setConsent(readConsent()); setReady(true) }
    sync()
    const reopen = () => { setConsent(readConsent()); setReopened(true) }
    window.addEventListener(CONSENT_EVENT, sync)
    window.addEventListener(REOPEN_EVENT, reopen)
    return () => { window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener(REOPEN_EVENT, reopen) }
  }, [])

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const show = ready && shouldShowBanner({
    gaId,
    consent,
    reopened,
    hostname: typeof location === 'undefined' ? '' : location.hostname,
    pathname: pathname ?? '/',
    rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'liveportfolio.site',
  })

  useEffect(() => { if (show) first.current?.querySelector('button')?.focus({ preventScroll: true }) }, [show])

  if (!show) return null
  const decide = (analytics: boolean) => {
    if (!analytics) revokeAnalytics(gaId)
    saveConsent(analytics)
    setReopened(false)
  }
  return (
    <div ref={first}>
      <BannerView onAccept={() => decide(true)} onReject={() => decide(false)} />
    </div>
  )
}
