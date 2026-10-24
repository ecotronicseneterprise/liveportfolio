'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { TEMPLATES, TEMPLATE_LABEL } from '@/components/templates/dynamic'
import { ALL_TEMPLATES, isProTemplate, type TemplateId } from '@/lib/plans'
import { CheckIcon, LockIcon } from './ui/icons'

export { TEMPLATE_LABEL }

export function useDebounced<V>(value: V, ms = 300): V {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

function useInView(rootMargin = '200px'): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, rootMargin])
  return [ref, seen]
}

/**
 * The real template component, scaled to fit a box. Tailwind breakpoints follow the REAL viewport, so the template is
 * rendered at the viewport width on a phone (what the person would see on their phone) and at 1280px on a desktop,
 * then scaled down with a CSS transform. Non-interactive (inert, aria-hidden): it is a picture of the page.
 */
export const TemplateThumb = memo(function TemplateThumb({ id, content, height = 190, eager = false, scrollable = false }: { id: TemplateId; content: PortfolioContent; height?: number | string; eager?: boolean; scrollable?: boolean }) {
  const [ref, seen] = useInView()
  const [width, setWidth] = useState(0)
  const [vw, setVw] = useState(1280)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => { setWidth(el.clientWidth); setVw(window.innerWidth) }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [ref])
  const Tpl = TEMPLATES[id]
  const renderWidth = vw >= 1024 ? 1280 : Math.max(vw, 320)
  const scale = width ? width / renderWidth : 0.2
  return (
    <div ref={ref} style={{ height, overflow: scrollable ? 'auto' : 'hidden', position: 'relative', contain: scrollable ? 'layout style' : 'layout paint style', background: '#fff' }} aria-hidden="true">
      {(seen || eager) && width > 0 && (
        <div
          ref={(el) => { if (el) el.setAttribute('inert', '') }}
          style={{ width: renderWidth, transformOrigin: 'top left', transform: `scale(${scale})`, pointerEvents: 'none' }}
        >
          <Tpl content={content} />
        </div>
      )}
    </div>
  )
})

export interface GalleryProps {
  content: PortfolioContent
  selected: string
  onSelect: (id: TemplateId) => void
  /** Whether the person's plan includes Pro templates (selection is allowed either way; the lock is informational). */
  isPro?: boolean
}

/** "Pick a look": every template rendered from the person's own details. Debounced, memoised, lazily mounted. */
export default function TemplateGallery({ content, selected, onSelect, isPro = false }: GalleryProps) {
  const live = useDebounced(content, 300)
  const items = useMemo(() => ALL_TEMPLATES.map((id) => ({ id, pro: isProTemplate(id) })), [])
  return (
    <section aria-label="Pick a look">
      <ul className="lp-tpl-grid" role="list">
        {items.map(({ id, pro }) => {
          const on = selected === id
          return (
            <li key={id}>
              <button type="button" aria-pressed={on} onClick={() => onSelect(id)} className="lp-tpl">
                <TemplateThumb id={id} content={live} />
                <span className="lp-tpl-foot">
                  <span>{TEMPLATE_LABEL[id]}</span>
                  {pro && !isPro && <span className="lp-pro" aria-label="Included with Pro"><LockIcon />Pro</span>}
                  {on && <span className="lp-picked" aria-hidden="true"><CheckIcon /></span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="lp-fine" style={{ marginTop: 'var(--lp-s3)' }}>Preview any template with your own details. Publishing with a Pro template needs the Pro plan.</p>
    </section>
  )
}
