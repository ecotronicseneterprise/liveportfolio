'use client'

// Layout for the split editor. Desktop (1024px and up): the edit form on the left, the live preview and the action panel on the right,
// which stays in view while the form scrolls. Phone and tablet: no cramped split, but two tabs, "Edit" and "Preview". `enabled=false`
// keeps the component reusable in tests and fallbacks.
import { useState } from 'react'
import { t } from '@/lib/onboarding/t'

export default function FreeSplit({ enabled, preview, children }: { enabled: boolean; preview: React.ReactNode; children: React.ReactNode }) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  if (!enabled) return <>{children}</>

  const tabBtn = (id: 'edit' | 'preview', label: string) => (
    <button
      type="button"
      role="tab"
      id={`fs-tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`fs-panel-${id}`}
      onClick={() => setTab(id)}
      className={`min-h-[44px] flex-1 text-sm font-semibold border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] ${tab === id ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-transparent text-gray-600'}`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div role="tablist" aria-label="Edit or preview" className="lg:hidden flex mb-4 bg-white border border-gray-100 rounded-xl">
        {tabBtn('edit', t('freeSplit.tabEdit'))}
        {tabBtn('preview', t('freeSplit.tabPreview'))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <div id="fs-panel-edit" role="tabpanel" aria-labelledby="fs-tab-edit" className={tab === 'edit' ? 'block' : 'hidden lg:block'}>
          {children}
        </div>
        <div id="fs-panel-preview" role="tabpanel" aria-labelledby="fs-tab-preview" className={`${tab === 'preview' ? 'block' : 'hidden lg:block'} lg:sticky lg:top-4 bg-white border border-gray-100 rounded-2xl p-5`}>
          {preview}
        </div>
      </div>
    </div>
  )
}
