'use client'

import CopyButton from '@/components/docs/CopyButton'
import { FIRST_CHAT_MESSAGE } from '@/lib/docs/sync'

// The first message to paste into a new chat. The text is always visible, with Copy on the same line, so people see what they copy.
export default function FirstMessage() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm font-semibold text-gray-900">Paste this as the first message of a new chat</p>
      <div className="mt-2 flex items-start justify-between gap-3 rounded-lg bg-white p-3">
        <p className="min-w-0 text-sm text-gray-800">{FIRST_CHAT_MESSAGE}</p>
        <CopyButton text={FIRST_CHAT_MESSAGE} label="Copy" />
      </div>
    </div>
  )
}
