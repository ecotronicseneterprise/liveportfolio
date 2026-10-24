'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CONSENT_EVENT, readConsent, shouldLoadAnalytics, type Consent } from '@/lib/consent'

// Google Analytics 4, and only that. It is loaded after the visitor explicitly accepts (lib/consent.ts, ConsentBanner), never
// before, and never on a person's own portfolio. The Meta Pixel was removed; do not reintroduce it without a new consent
// category and a policy update (tests/consent.test.ts fails if it comes back).
export default function TrackingScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const pathname = usePathname()
  const [consent, setConsent] = useState<Consent | null>(null)

  useEffect(() => {
    const sync = () => setConsent(readConsent())
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  const load = shouldLoadAnalytics({
    gaId,
    consent,
    hostname: typeof location === 'undefined' ? '' : location.hostname,
    pathname: pathname ?? '/',
    production: process.env.NODE_ENV === 'production',
    rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'liveportfolio.site',
  })

  useEffect(() => {
    if (!load || typeof window.gtag === 'undefined') return
    window.gtag('event', 'page_view', { page_path: pathname, page_location: window.location.href })
  }, [load, pathname])

  if (!load || !gaId) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', {
  send_page_view: window.self === window.top,
  anonymize_ip: true
});`}
      </Script>
    </>
  )
}
