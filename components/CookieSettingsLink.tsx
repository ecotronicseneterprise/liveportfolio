'use client'

import { REOPEN_EVENT } from '@/lib/consent'

/** Reopens the consent banner so a choice can be changed. Rendered only where analytics is configured. */
export default function CookieSettingsLink({ className = 'hover:text-gray-600 transition-colors' }: { className?: string }) {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null
  return (
    <button type="button" className={`${className} min-h-[44px] bg-transparent p-0`} onClick={() => window.dispatchEvent(new Event(REOPEN_EVENT))}>
      Cookie settings
    </button>
  )
}
