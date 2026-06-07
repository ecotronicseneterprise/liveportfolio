"use client"

import { useEffect } from 'react'

export default function TrackingScripts() {
  useEffect(() => {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!pixelId && !gaId) return

    const cleanupElements: HTMLElement[] = []

    if (pixelId) {
      const script = document.createElement('script')
      script.innerHTML = `!function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');`
      document.head.appendChild(script)
      cleanupElements.push(script)

      const noscript = document.createElement('noscript')
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`
      document.head.appendChild(noscript)
      cleanupElements.push(noscript)
    }

    if (gaId) {
      const gaScript = document.createElement('script')
      gaScript.async = true
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
      document.head.appendChild(gaScript)
      cleanupElements.push(gaScript)

      const gaInline = document.createElement('script')
      gaInline.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`
      document.head.appendChild(gaInline)
      cleanupElements.push(gaInline)
    }

    return () => {
      cleanupElements.forEach((el) => {
        try {
          document.head.removeChild(el)
        } catch (e) {
          // ignore
        }
      })
    }
  }, [])

  return null
}
