'use client'

// Phone view for a Pro account: every design as a real, scrollable preview of the person's own details (not a row of small buttons).
// Swipe sideways to browse, tap a card to switch. Cards load their preview only when they come into view.
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { TemplateThumb, useDebounced } from '@/components/onboarding/TemplateGallery'
import { TEMPLATE_LABEL } from '@/components/templates/dynamic'
import { CheckIcon } from '@/components/onboarding/ui/icons'
import { ALL_TEMPLATES, isProTemplate, type TemplateId } from '@/lib/plans'

export interface TemplateCarouselProps {
  content: PortfolioContent
  /** The design currently shown (saved or being previewed). */
  currentId: string
  onPick: (id: TemplateId) => void
}

export default function TemplateCarousel({ content, currentId, onPick }: TemplateCarouselProps) {
  const live = useDebounced(content, 300)
  const row = useRef<HTMLUListElement>(null)
  const cards = useRef<Record<string, HTMLLIElement | null>>({})

  // Open on the current design so it is not hidden off-screen.
  useEffect(() => {
    const el = cards.current[currentId]
    if (el && row.current) row.current.scrollTo({ left: el.offsetLeft - 16, behavior: 'auto' })
    // only on first show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section aria-label="Choose a design" className="-mx-1">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-sm font-medium text-gray-700">Your designs, with your own details</p>
        <p className="text-xs text-gray-500">Swipe to browse</p>
      </div>
      <ul
        ref={row}
        className="mt-2 flex list-none gap-3 overflow-x-auto px-1 pb-3 m-0 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
      >
        {ALL_TEMPLATES.map((id) => {
          const on = id === currentId
          const pro = isProTemplate(id)
          return (
            <li key={id} ref={(el) => { cards.current[id] = el }} className="flex-shrink-0 snap-center" style={{ width: 'min(68vw, 250px)' }}>
              <button
                type="button"
                onClick={() => onPick(id)}
                aria-pressed={on}
                aria-label={`${TEMPLATE_LABEL[id]}${pro ? ', Pro design' : ''}${on ? ', selected' : ''}`}
                className={`block w-full overflow-hidden rounded-xl bg-white p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 ${on ? 'border-2 border-[#0A66C2]' : 'border border-gray-300'}`}
              >
                <span className="block" aria-hidden="true" style={{ pointerEvents: 'none' }}>
                  <TemplateThumb id={id} content={live} height={300} />
                </span>
                <span className="flex min-h-[44px] items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">
                  <span className="truncate">{TEMPLATE_LABEL[id]}</span>
                  <span className="flex items-center gap-2 text-xs font-medium">
                    {pro && <span className="rounded-full bg-[#E8F0F9] px-2 py-0.5 text-[#084D9A]">Pro</span>}
                    {on && <span className="inline-flex items-center gap-1 text-[#0A66C2]"><CheckIcon />Selected</span>}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
