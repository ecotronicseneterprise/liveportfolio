'use client'

// The split editor's preview surface: one live preview of the person's own details, a single row of small square design tiles under it
// (tap, swipe or arrow keys to compare), plus a short plan-aware panel. On phones this is the Preview tab; on larger screens it sits
// beside the form.
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { TemplateThumb, useDebounced } from '@/components/onboarding/TemplateGallery'
import { TEMPLATE_LABEL } from '@/components/templates/dynamic'
import { LockIcon, CheckIcon } from '@/components/onboarding/ui/icons'
import { ALL_TEMPLATES, PLANS, PRO_TEMPLATES, comingSoon, isProTemplate, type PlanId, type TemplateId } from '@/lib/plans'
import { formatNaira } from '@/lib/billing/copy'
import { t } from '@/lib/onboarding/t'

const NUDGE_KEY = 'lp_tiles_nudged'
const SWIPE_PX = 56

export interface FreePreviewProps {
  content: PortfolioContent
  plan: PlanId
  slug: string
  liveUrl: string
  /** The design being previewed (may be a Pro one). */
  previewId: string
  /** The design currently saved as the person's public choice. */
  savedId: string
  onPick: (id: TemplateId) => void
  onUpgrade: () => void
  onPublish: () => void
}

/** Next/previous design in the row, wrapping round. Pure, so it can be tested. */
export const stepTemplate = (current: string, delta: 1 | -1): TemplateId => {
  const i = ALL_TEMPLATES.indexOf(current as TemplateId)
  const from = i === -1 ? 0 : i
  return ALL_TEMPLATES[(from + delta + ALL_TEMPLATES.length) % ALL_TEMPLATES.length]
}

export default function FreePreview({ content, plan, slug, liveUrl, previewId, savedId, onPick, onUpgrade, onPublish }: FreePreviewProps) {
  const live = useDebounced(content, 250)
  const row = useRef<HTMLUListElement>(null)
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const interacted = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const id = (ALL_TEMPLATES.includes(previewId as TemplateId) ? previewId : 'minimal') as TemplateId
  const isFree = plan === 'free'
  const isBasic = plan === 'basic'
  const locked = isProTemplate(id) && plan !== 'pro'
  const name = TEMPLATE_LABEL[id]

  // First visit: nudge the row once so people see it moves. Never with reduced motion, never again after any interaction.
  useEffect(() => {
    let done = false
    try { done = localStorage.getItem(NUDGE_KEY) === '1' } catch { done = true }
    if (done || typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const el = row.current
    if (!el) return
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => {
      if (interacted.current) return
      el.scrollTo({ left: 72, behavior: 'smooth' })
      timers.push(setTimeout(() => { if (!interacted.current) el.scrollTo({ left: 0, behavior: 'smooth' }) }, 650))
      try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* storage blocked */ }
    }, 900))
    return () => timers.forEach(clearTimeout)
  }, [])

  const pick = useCallback((next: TemplateId, focus = false) => {
    interacted.current = true
    onPick(next)
    const tile = tileRefs.current[next]
    if (tile) {
      tile.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      if (focus) tile.focus()
    }
  }, [onPick])

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (e.key === 'Home') { e.preventDefault(); pick(ALL_TEMPLATES[0], true); return }
    if (e.key === 'End') { e.preventDefault(); pick(ALL_TEMPLATES[ALL_TEMPLATES.length - 1], true); return }
    if (!d) return
    e.preventDefault()
    pick(stepTemplate(id, d as 1 | -1), true)
  }

  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY } },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) pick(stepTemplate(id, dx < 0 ? 1 : -1))
    },
    onPointerCancel: () => { start.current = null },
  }

  const tiles = useMemo(() => ALL_TEMPLATES.map((tid) => ({ id: tid, pro: isProTemplate(tid) })), [])
  const soon = comingSoon().map((f) => f.label).join(', ')

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700" id="fp-hint">{t('freeSplit.hint')}</p>

      <div
        {...swipe}
        className="border border-gray-200 rounded-xl overflow-hidden bg-white"
        style={{ touchAction: 'pan-y' }}
        role="img"
        aria-label={t('freeSplit.previewLabel', { name })}
      >
        <TemplateThumb id={id} content={live} height="min(44vh, 420px)" scrollable eager />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{locked ? t('freeSplit.previewing', { name }) : t('freeSplit.selected', { name })}</p>

      <ul
        ref={row}
        role="listbox"
        aria-labelledby="fp-hint"
        aria-label={t('freeSplit.tilesLabel')}
        onKeyDown={onKey}
        onPointerDown={() => { interacted.current = true }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 list-none p-0 m-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {tiles.map(({ id: tid, pro }) => {
          const on = tid === id
          return (
            <li key={tid} className="snap-start flex-shrink-0">
              <button
                type="button"
                role="option"
                aria-selected={on}
                aria-label={pro ? `${TEMPLATE_LABEL[tid]}, Pro` : TEMPLATE_LABEL[tid]}
                tabIndex={on ? 0 : -1}
                ref={(el) => { tileRefs.current[tid] = el }}
                onClick={() => pick(tid)}
                className={`relative block w-[88px] rounded-lg bg-white p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 ${on ? 'border-2 border-[#0A66C2]' : 'border border-gray-300'}`}
                style={{ minHeight: 44 }}
              >
                <span className="block overflow-hidden rounded-t-md" style={{ width: 84, height: 84 }} aria-hidden="true">
                  <TemplateThumb id={tid} content={live} height={84} />
                </span>
                <span className="flex items-center justify-between gap-1 px-1.5 py-1 text-[11px] font-medium text-gray-900">
                  <span className="truncate">{TEMPLATE_LABEL[tid]}</span>
                  {pro && plan !== 'pro' ? <LockIcon /> : on ? <CheckIcon /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {locked && (
        <p className="text-sm text-[#084D9A] bg-[#E8F0F9] rounded-xl px-4 py-3" role="note">
          {t(isFree ? 'freeSplit.proLocked' : 'freeSplit.proLockedBasic', { name })}{' '}
          <button type="button" onClick={onUpgrade} className="underline font-semibold min-h-[44px]">{t('freeSplit.upgradePro')}</button>
        </p>
      )}
      {!locked && savedId === id && (
        <p className="text-sm text-gray-600">{t('freeSplit.savedChoice', { name })}</p>
      )}

      <section aria-labelledby="fp-value" className="border-t border-gray-200 pt-4">
        <h3 id="fp-value" className="text-base font-semibold text-gray-900">{t(isFree ? 'freeSplit.valueTitle' : 'freeSplit.liveTitle')}</h3>
        <p className="mt-1 text-sm text-gray-700">{t(isFree ? 'freeSplit.valueLead' : 'freeSplit.liveLead')}</p>
        {isFree ? (
          <>
            <button
              type="button"
              onClick={onPublish}
              className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#0A66C2] px-6 text-base font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2"
            >
              {t('freeSplit.publish')}
            </button>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-800 list-disc pl-5">
              <li>{t('freeSplit.valuePoint1', { slug: slug || 'yourname' })}</li>
              <li>{t('freeSplit.valuePoint2')}</li>
              <li>{t('freeSplit.basicLine', { price: formatNaira(PLANS.basic.priceNgn ?? 0) })}</li>
              <li>{t('freeSplit.proLine', { price: formatNaira(PLANS.pro.priceNgn ?? 0), count: PRO_TEMPLATES.length })}</li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">{t('freeSplit.oneTime')} {t('freeSplit.refund')}</p>
            {soon && <p className="mt-3 text-xs text-gray-600">{t('freeSplit.soon', { list: soon })}</p>}
          </>
        ) : (
          <>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#0A66C2] px-6 text-base font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2"
            >
              {t('freeSplit.viewLive')}
            </a>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-800 list-disc pl-5">
              <li>{t('freeSplit.livePoint1', { slug: slug || 'yourname' })}</li>
              <li>{t('freeSplit.livePoint2')}</li>
              {isBasic && <li>{t('freeSplit.upgradeLine', { count: PRO_TEMPLATES.length })}</li>}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
