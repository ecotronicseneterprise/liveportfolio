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
  const shown = (seen || eager) && width > 0
  // A CSS transform does not shrink the layout box, so the scroll area would keep the template's unscaled height (a blank
  // gap under the content) and its unscaled width (a sideways scrollbar). The outer box therefore gets the SCALED size.
  const inner = useRef<HTMLDivElement | null>(null)
  const [contentH, setContentH] = useState(0)
  useEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => setContentH(el.offsetHeight)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [shown, id, renderWidth])
  return (
    <div ref={ref} style={{ height, overflow: scrollable ? 'auto' : 'hidden', position: 'relative', contain: scrollable ? 'layout style' : 'layout paint style', background: '#fff' }} aria-hidden="true">
      {shown && (
        <div style={{ width: renderWidth * scale, height: contentH * scale, overflow: 'hidden' }}>
          <div
            ref={(el) => { inner.current = el; if (el) el.setAttribute('inert', '') }}
            style={{ width: renderWidth, transformOrigin: 'top left', transform: `scale(${scale})`, pointerEvents: 'none' }}
          >
            <Tpl content={content} />
          </div>
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
  /** A tight strip of small cards (all ten visible beside the live preview) instead of the large grid. */
  compact?: boolean
}

/** "Pick a look": every template rendered from the person's own details. Debounced, memoised, lazily mounted. */
export default function TemplateGallery({ content, selected, onSelect, isPro = false, compact = false }: GalleryProps) {
  const live = useDebounced(content, 300)
  const items = useMemo(() => ALL_TEMPLATES.map((id) => ({ id, pro: isProTemplate(id) })), [])
  return (
    <section aria-label="Pick a look">
      <ul className={compact ? 'lp-tpl-mini' : 'lp-tpl-grid'} role="list">
        {items.map(({ id, pro }) => {
          const on = selected === id
          return (
            <li key={id} className="lp-tpl-item">
              {/* The preview contains the template's own buttons, so it must not sit INSIDE a <button> (invalid, and flaky on
                  phones). The card is plain markup; one transparent button over it carries the tap, the name and the state. */}
              <div className="lp-tpl" data-on={on} aria-hidden="true">
                <TemplateThumb id={id} content={live} height={compact ? 64 : 190} />
                <span className="lp-tpl-foot">
                  <span className="lp-tpl-name">{TEMPLATE_LABEL[id]}</span>
                  {pro && !isPro && <span className="lp-pro"><LockIcon /><span className="lp-pro-text">Pro</span></span>}
                  {on && <span className="lp-picked"><CheckIcon /></span>}
                </span>
              </div>
              <button type="button" className="lp-tpl-hit" aria-pressed={on} aria-label={pro && !isPro ? `${TEMPLATE_LABEL[id]}, included with Pro` : TEMPLATE_LABEL[id]} onClick={() => onSelect(id)} />
            </li>
          )
        })}
      </ul>
      {!compact && <p className="lp-fine" style={{ marginTop: 'var(--lp-s3)' }}>Preview any template with your own details. Publishing with a Pro template needs the Pro plan.</p>}
    </section>
  )
}
