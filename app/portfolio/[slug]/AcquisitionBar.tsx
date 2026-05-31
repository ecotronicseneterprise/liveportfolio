'use client'

import { useState, useEffect } from 'react'

export default function AcquisitionBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('dismissed-cta') === '1') return
    setVisible(true)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('dismissed-cta', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-[#0A66C2] shadow-lg rounded-full px-5 py-3 max-w-sm w-full sm:w-auto">
        <p className="text-sm text-white flex-1">
          Like this portfolio?{' '}
          <a
            href="https://liveportfolio.site"
            className="font-semibold underline hover:no-underline"
          >
            Create yours in 5 minutes →
          </a>
        </p>
        <button
          onClick={dismiss}
          className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
