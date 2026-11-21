'use client'

import { useState } from 'react'
import CopyButton from '@/components/docs/CopyButton'
import { FIRST_CHAT_MESSAGE, FIRST_CHAT_NOTE } from '@/lib/docs/sync'

// One quiet row: a title, one line of help, a Copy button. The message itself stays hidden until "Show".
export default function FirstMessage() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">First message for a new chat</p>
          <p className="text-xs text-gray-600">{FIRST_CHAT_NOTE}</p>
        </div>
        <CopyButton text={FIRST_CHAT_MESSAGE} label="Copy" />
      </div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-xs font-medium text-[#0A66C2] underline">{open ? 'Hide' : 'Show'}</button>
      {open && <p className="mt-2 rounded-lg bg-white p-3 text-sm text-gray-800">{FIRST_CHAT_MESSAGE}</p>}
    </div>
  )
}
