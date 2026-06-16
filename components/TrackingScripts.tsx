'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function TrackingScripts() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  const pathname = usePathname()

  useEffect(() => {
    if (typeof window.gtag === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
    })
  }, [pathname])

  if (!pixelId && !gaId) return null
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      {pixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', {
  send_page_view: window.self === window.top
});`}
          </Script>
        </>
      )}
    </>
  )
}
