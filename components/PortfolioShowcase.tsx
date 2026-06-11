'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ShowcasePortfolio {
  slug: string
  name: string
  role: string
  template: string
  avatar: string
  accent: string
  mode: 'dark' | 'light'
  skills: string[]
  highlight: string
}

const PORTFOLIOS: ShowcasePortfolio[] = [
  // dark
  {
    slug: 'james-chen',
    name: 'James Chen',
    role: 'Senior Software Engineer',
    template: 'Developer',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/james-chen.jpg',
    accent: '#2563EB',
    mode: 'dark',
    skills: ['Go', 'Rust', 'TypeScript', 'Kubernetes'],
    highlight: '$2.3B processed · 60% latency reduction',
  },
  // light
  {
    slug: 'sofia-martinez',
    name: 'Sofia Martinez',
    role: 'Senior Product Designer',
    template: 'Designer',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/sofia-martinez.jpg',
    accent: '#6D28D9',
    mode: 'light',
    skills: ['Figma', 'Framer', 'User Research', 'Design Systems'],
    highlight: '34% retention increase · 8M+ daily users',
  },
  // dark
  {
    slug: 'fatima-hassan',
    name: 'Fatima Hassan',
    role: 'Senior Data Scientist',
    template: 'Data Scientist',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/fatima-hassan.jpg',
    accent: '#0F766E',
    mode: 'dark',
    skills: ['Python', 'SQL', 'TensorFlow', 'dbt'],
    highlight: '₦4.2B in approved loans · 55% false rejection reduction',
  },
  // light
  {
    slug: 'david-mensah',
    name: 'David Mensah',
    role: 'Senior Product Manager',
    template: 'Product Manager',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/david_mensah.jpg',
    accent: '#B45309',
    mode: 'light',
    skills: ['Product Strategy', 'SQL', 'A/B Testing', 'OKRs'],
    highlight: '50,000 merchants onboarded · $2M ARR',
  },
  // dark
  {
    slug: 'michael-roberts',
    name: 'Michael Roberts',
    role: 'Senior Financial Analyst',
    template: 'Finance',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/michael-roberts.jpg',
    accent: '#1E3A8A',
    mode: 'dark',
    skills: ['Financial Modelling', 'Excel', 'SQL', 'Power BI'],
    highlight: '£2B+ in M&A transactions · CFA Charterholder',
  },
  // light
  {
    slug: 'priya-sharma',
    name: 'Priya Sharma',
    role: 'Brand & Content Strategist',
    template: 'Creative',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/priya-sharma.jpg',
    accent: '#BE185D',
    mode: 'light',
    skills: ['Brand Strategy', 'Content Marketing', 'SEO', 'Copywriting'],
    highlight: '340K monthly sessions · £600K paid spend saved',
  },
  // dark
  {
    slug: 'elena-vasquez',
    name: 'Elena Vasquez',
    role: 'Senior Security Engineer',
    template: 'Cybersecurity',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/elena-vasquez.jpg',
    accent: '#166534',
    mode: 'dark',
    skills: ['Penetration Testing', 'Python', 'AWS Security', 'OSCP'],
    highlight: 'Zero incidents 18 months · SOC 2 Type II',
  },
  // light
  {
    slug: 'chidi-okafor',
    name: 'Chidi Okafor',
    role: 'Software Engineering Graduate',
    template: 'Graduate',
    avatar: 'https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/chidi_okafor.jpg',
    accent: '#4F46E5',
    mode: 'light',
    skills: ['React', 'Node.js', 'Python', 'SQL'],
    highlight: '300+ active users · First role ready',
  },
]

const DARK_BG: Record<string, string> = {
  Developer: '#0F172A',
  'Data Scientist': '#134E4A',
  Finance: '#0F172A',
  Cybersecurity: '#052E16',
}

function darkBg(p: ShowcasePortfolio): string {
  return DARK_BG[p.template] ?? '#1E293B'
}

// Card height in px — iframe viewport will be computed from this + scale
const CARD_HEIGHT = 420
// Scale the iframe desktop layout (1280px wide) down to fit the card
const IFRAME_SCALE = 0.27
// The iframe renders at 1280px wide; after scaling the visible width = 1280 * 0.27 = ~346px
// We want the card wrapper to be that visual width, so overflow is clipped correctly.
const IFRAME_WIDTH = 1280
const IFRAME_HEIGHT = Math.round(CARD_HEIGHT / IFRAME_SCALE)

function Card({ p, index }: { p: ShowcasePortfolio; index: number }) {
  const isDark = p.mode === 'dark'
  const barBg = isDark ? 'rgba(15,23,42,0.90)' : 'rgba(255,255,255,0.92)'
  const textPrimary = isDark ? '#F8FAFC' : '#0A0A0A'
  const textMuted = isDark ? '#94A3B8' : '#6B7280'
  const url = `https://${p.slug}.liveportfolio.site`

  return (
    <div
      onClick={() => window.open(url, '_blank')}
      style={{
        display: 'block',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        border: isDark
          ? `1px solid rgba(255,255,255,0.07)`
          : `2px solid ${p.accent}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        height: CARD_HEIGHT,
        cursor: 'pointer',
      }}
    >
      {/* Scaled iframe preview */}
      <div style={{ width: IFRAME_WIDTH * IFRAME_SCALE, height: CARD_HEIGHT, overflow: 'hidden', position: 'relative' }}>
        <iframe
          src={url}
          title={`${p.name} portfolio`}
          scrolling="no"
          loading={index < 3 ? 'eager' : 'lazy'}
          style={{
            width: IFRAME_WIDTH,
            height: IFRAME_HEIGHT,
            border: 'none',
            transform: `scale(${IFRAME_SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Info bar overlay pinned to bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: barBg,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: textPrimary, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.name}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: textMuted, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.role}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: p.accent,
            background: `${p.accent}26`,
            padding: '3px 8px',
            borderRadius: 99,
            textTransform: 'uppercase',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          {p.template}
        </a>
      </div>
    </div>
  )
}

// How many clones to append at the end (enough to fill the peek)
const CLONE_COUNT = 3

export default function PortfolioShowcase() {
  const total = PORTFOLIOS.length
  // real index into PORTFOLIOS (0..total-1), used for dots + accent colour
  const [realIndex, setRealIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const transitioning = useRef(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  // track position as a raw slot index (0..total+CLONE_COUNT-1)
  const slotRef = useRef(0)

  // The rendered list: real cards + clones of the first CLONE_COUNT
  const items = [...PORTFOLIOS, ...PORTFOLIOS.slice(0, CLONE_COUNT)]

  const getCardWidth = useCallback((): number => {
    const track = trackRef.current
    if (!track) return 0
    const first = track.firstElementChild as HTMLElement | null
    if (!first) return 0
    return first.offsetWidth + 12
  }, [])

  const moveTo = useCallback((slot: number, animated: boolean) => {
    const track = trackRef.current
    if (!track) return
    const cardWidth = getCardWidth()
    track.style.transition = animated
      ? 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none'
    track.style.transform = `translateX(-${slot * cardWidth}px)`
    slotRef.current = slot
  }, [getCardWidth])

  const advance = useCallback(() => {
    if (transitioning.current) return
    transitioning.current = true
    const nextSlot = slotRef.current + 1
    const nextReal = nextSlot % total
    setRealIndex(nextReal)
    moveTo(nextSlot, true)

    // After transition ends, if we've hit a clone, silently jump to the real position
    setTimeout(() => {
      if (nextSlot >= total) {
        moveTo(nextSlot % total, false)
      }
      transitioning.current = false
    }, 620)
  }, [moveTo, total])

  const retreat = useCallback(() => {
    if (transitioning.current) return
    transitioning.current = true
    let prevSlot = slotRef.current - 1
    // If already at 0, silently jump to the equivalent clone position then slide back
    if (prevSlot < 0) {
      moveTo(total, false)
      prevSlot = total - 1
    }
    const prevReal = prevSlot % total
    setRealIndex(prevReal)
    // Small delay lets the silent jump paint before we animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moveTo(prevSlot < 0 ? total - 1 : prevSlot, true)
        setTimeout(() => { transitioning.current = false }, 620)
      })
    })
  }, [moveTo, total])

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (paused) return
    const id = setInterval(advance, 4000)
    return () => clearInterval(id)
  }, [paused, advance])

  // Recalculate position on resize
  useEffect(() => {
    const handler = () => moveTo(slotRef.current, false)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [moveTo])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setPaused(true)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? advance() : retreat()
    }
    touchStartX.current = null
    touchStartY.current = null
    setPaused(false)
  }

  const jumpTo = (i: number) => {
    if (transitioning.current) return
    setRealIndex(i)
    moveTo(i, true)
    setPaused(false)
  }

  return (
    <div className="w-full border-t border-gray-100 py-10 sm:py-14">
      {/* Header */}
      <div className="px-6 sm:px-10 lg:px-16 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] leading-tight">
          Portfolios built with LivePortfolio
        </h2>
        <p className="text-sm text-gray-400 mt-1">Every one built in under 10 minutes.</p>
      </div>

      {/* Slideshow */}
      <div
        style={{ overflow: 'hidden', position: 'relative', paddingLeft: 24 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            willChange: 'transform',
          }}
        >
          {items.map((p, i) => (
            <div
              key={`${p.slug}-${i}`}
              style={{
                flexShrink: 0,
                // Mobile: full width minus the 24px left padding + 24px right breathing room
                // Desktop: ~78% so next card peeks ~18% on the right
                width: 'clamp(280px, calc(100vw - 72px), 520px)',
                maxWidth: '78vw',
                marginRight: 12,
              }}
            >
              <Card p={p} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots + arrows */}
      <div className="flex items-center justify-center gap-3 mt-6 px-6">
        <button
          onClick={retreat}
          aria-label="Previous portfolio"
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {PORTFOLIOS.map((p, i) => (
            <button
              key={p.slug}
              onClick={() => jumpTo(i)}
              aria-label={`Go to ${p.name}`}
              style={{
                width: i === realIndex ? 20 : 6,
                height: 6,
                borderRadius: 99,
                background: i === realIndex ? PORTFOLIOS[realIndex].accent : '#D1D5DB',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 300ms ease, background 300ms ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={advance}
          aria-label="Next portfolio"
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
