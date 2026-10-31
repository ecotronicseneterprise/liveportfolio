'use client'

// Phone and tablet view for a Pro account in the editor: one big live preview of the person's own details, and a row of design cards.
// Tap a card: it becomes the person's design (saved) and the preview above shows it. Swiping the preview (or the arrows) only
// PREVIEWS another design; a small banner says so, and tapping that design's card makes it the choice. The current design has a green tick.
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { TemplateThumb, useDebounced } from '@/components/onboarding/TemplateGallery'
import { TEMPLATE_LABEL } from '@/components/templates/dynamic'
import { ALL_TEMPLATES, isProTemplate, type TemplateId } from '@/lib/plans'
import { stepTemplate } from '@/components/dashboard/FreePreview'

const SWIPE_PX = 48

export interface TemplateCarouselProps {
  content: PortfolioContent
  /** The design shown in the big preview. */
  previewId: string
  /** The design that is saved as the person's choice. */
  savedId: string
  /** Show another design in the preview (not saved). */
  onPreview: (id: TemplateId) => void
  /** Make this design the person's choice (saved) and show it. */
  onUse: (id: TemplateId) => void
}

const Tick = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.4l2.3 2.3 4.7-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function TemplateCarousel({ content, previewId, savedId, onPreview, onUse }: TemplateCarouselProps) {
  const live = useDebounced(content, 300)
  const start = useRef<{ x: number; y: number } | null>(null)
  const tiles = useRef<Record<string, HTMLButtonElement | null>>({})
  const id = (ALL_TEMPLATES.includes(previewId as TemplateId) ? previewId : ALL_TEMPLATES[0]) as TemplateId
  const index = ALL_TEMPLATES.indexOf(id)
  const previewingOnly = id !== savedId

  // keep the card of the design in the preview in view
  useEffect(() => {
    tiles.current[id]?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [id])

  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY } },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.4) onPreview(stepTemplate(id, dx < 0 ? 1 : -1))
    },
    onPointerCancel: () => { start.current = null },
  }

  return (
    <section aria-label="Choose a design" className="space-y-3">
      <p className="text-sm font-medium text-gray-700" id="tc-hint">Swipe the preview to look around. Tap a card below to use that design.</p>

      <div
        {...swipe}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        style={{ touchAction: 'pan-y' }}
        role="img"
        aria-label={`Preview of your portfolio in the ${TEMPLATE_LABEL[id]} design`}
      >
        <TemplateThumb id={id} content={live} height="min(46vh, 440px)" scrollable eager />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous design" onClick={() => onPreview(stepTemplate(id, -1))} className="min-h-[44px] min-w-[44px] rounded-full border border-gray-200 bg-white text-lg text-gray-800">‹</button>
        <div className="min-w-0 flex-1 text-center" role="status" aria-live="polite">
          <p className="truncate text-sm font-semibold text-gray-900">
            {TEMPLATE_LABEL[id]}
            {isProTemplate(id) && <span className="ml-2 rounded-full bg-[#E8F0F9] px-2 py-0.5 text-xs font-medium text-[#084D9A]">Pro</span>}
            <span className="ml-2 text-xs font-normal text-gray-500">{index + 1} of {ALL_TEMPLATES.length}</span>
          </p>
          {previewingOnly
            ? <p className="mt-0.5 text-xs text-amber-800">Previewing only. Tap its card below to use it.</p>
            : <p className="mt-0.5 text-xs text-[#0B6B4A]">Your current design</p>}
        </div>
        <button type="button" aria-label="Next design" onClick={() => onPreview(stepTemplate(id, 1))} className="min-h-[44px] min-w-[44px] rounded-full border border-gray-200 bg-white text-lg text-gray-800">›</button>
      </div>

      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2" style={{ scrollbarWidth: 'thin' }} aria-label="All designs">
        {ALL_TEMPLATES.map((tid) => {
          const shown = tid === id
          const current = tid === savedId
          return (
            <li key={tid} className="flex-shrink-0">
              <button
                type="button"
                ref={(el) => { tiles.current[tid] = el }}
                onClick={() => onUse(tid)}
                aria-pressed={current}
                aria-label={`${TEMPLATE_LABEL[tid]}${isProTemplate(tid) ? ', Pro' : ''}${current ? ', your current design' : ''}`}
                className={`relative block w-[76px] rounded-lg bg-white p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] ${current ? 'border-2 border-[#1D9E75]' : shown ? 'border-2 border-[#0A66C2]' : 'border border-gray-300'}`}
                style={{ minHeight: 44 }}
              >
                <span className="block overflow-hidden rounded-t-md" style={{ width: 72, height: 72, pointerEvents: 'none' }} aria-hidden="true">
                  <TemplateThumb id={tid} content={live} height={72} />
                </span>
                <span className="block truncate px-1.5 py-1 text-[11px] font-medium text-gray-900">{TEMPLATE_LABEL[tid]}</span>
                {current && (
                  <span className="absolute right-1 top-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1D9E75]" aria-hidden="true"><Tick /></span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
