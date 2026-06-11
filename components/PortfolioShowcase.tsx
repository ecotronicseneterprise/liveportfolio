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

function Card({ p }: { p: ShowcasePortfolio }) {
  const isDark = p.mode === 'dark'
  const bg = isDark ? darkBg(p) : '#ffffff'
  const textPrimary = isDark ? '#F8FAFC' : '#0A0A0A'
  const textMuted = isDark ? '#94A3B8' : '#6B7280'
  const divider = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'

  return (
    <a
      href={`/${p.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: bg,
        borderRadius: 16,
        padding: '20px 20px 18px',
        textDecoration: 'none',
        position: 'relative',
        borderLeft: isDark ? 'none' : `4px solid ${p.accent}`,
        border: isDark ? `1px solid rgba(255,255,255,0.07)` : undefined,
        borderLeftWidth: isDark ? undefined : 4,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Template badge */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: p.accent,
            background: `${p.accent}26`,
            padding: '3px 8px',
            borderRadius: 99,
            textTransform: 'uppercase',
          }}
        >
          {p.template}
        </span>
      </div>

      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 80 }}>
        <img
          src={p.avatar}
          alt={p.name}
          width={56}
          height={56}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            background: `${p.accent}33`,
          }}
          onError={(e) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const ph = el.nextElementSibling as HTMLElement | null
            if (ph) ph.style.display = 'flex'
          }}
        />
        {/* Initials fallback — hidden until img errors */}
        <div
          aria-hidden="true"
          style={{
            display: 'none',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `${p.accent}33`,
            color: p.accent,
            fontSize: 20,
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {p.name.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: textPrimary, lineHeight: 1.3 }}>
            {p.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: textMuted, lineHeight: 1.4 }}>
            {p.role}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: divider, marginBottom: 14 }} />

      {/* Skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {p.skills.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: p.accent,
              background: `${p.accent}1A`,
              padding: '3px 9px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: divider, marginBottom: 14 }} />

      {/* Highlight stat */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 16 }}>
        <span style={{ color: p.accent, fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>✦</span>
        <p style={{ margin: 0, fontSize: 13, color: isDark ? '#CBD5E1' : '#374151', lineHeight: 1.5, fontWeight: 500 }}>
          {p.highlight}
        </p>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: p.accent }}>
          View portfolio →
        </span>
      </div>
    </a>
  )
}

export default function PortfolioShowcase() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const total = PORTFOLIOS.length

  const goTo = useCallback((index: number) => {
    setCurrent(((index % total) + total) % total)
  }, [total])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 2000)
    return () => clearInterval(id)
  }, [paused, next])

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setPaused(true)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only register as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? next() : prev()
    }
    touchStartX.current = null
    touchStartY.current = null
    setPaused(false)
  }

  return (
    <div className="w-full border-t border-gray-100 py-10 sm:py-14">
      {/* Header */}
      <div className="px-6 sm:px-10 lg:px-16 mb-8">
        <p className="text-xs font-bold text-[#0A66C2] tracking-widest uppercase mb-2">
          Real portfolios
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] leading-tight">
          Portfolios built with LivePortfolio
        </h2>
        <p className="text-sm text-gray-400 mt-1">Every one built in under 10 minutes.</p>
      </div>

      {/* Slideshow */}
      <div
        style={{ overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            transition: 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            // On mobile: full card width = calc(100vw - 48px) + gap
            // On desktop: show 1.25 cards — handled via CSS custom properties via inline calc
            willChange: 'transform',
          }}
        >
          {PORTFOLIOS.map((p, i) => {
            // Offset from current, wrapped
            const offset = ((i - current + total) % total)
            // We render all cards but translate the track
            // Actual translation is done on the wrapper div below via CSS var trick
            return (
              <div
                key={p.slug}
                style={{
                  // Mobile: full width minus side padding (24px each side)
                  // Desktop: show 1 full + 25% peek → width = ~80% of container
                  flexShrink: 0,
                  width: 'var(--card-width, calc(100vw - 48px))',
                  marginRight: 12,
                  opacity: offset === 0 ? 1 : offset === 1 ? 0.6 : 0,
                  transition: 'opacity 400ms ease',
                  pointerEvents: offset === 0 ? 'auto' : 'none',
                }}
              >
                <Card p={p} />
              </div>
            )
          })}
        </div>

        {/* CSS to set card width per breakpoint and translate track */}
        <style>{`
          @media (min-width: 640px) {
            [data-showcase-track] { --card-width: calc(80% - 6px); }
          }
        `}</style>
      </div>

      {/* We drive translation via JS since CSS custom property on the track
          needs to respond to current index */}
      <TrackDriver trackRef={trackRef} current={current} total={total} />

      {/* Dot indicators + arrows */}
      <div className="flex items-center justify-center gap-3 mt-6 px-6">
        {/* Prev arrow */}
        <button
          onClick={prev}
          aria-label="Previous portfolio"
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {PORTFOLIOS.map((p, i) => (
            <button
              key={p.slug}
              onClick={() => { goTo(i); setPaused(false) }}
              aria-label={`Go to ${p.name}`}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 99,
                background: i === current ? PORTFOLIOS[current].accent : '#D1D5DB',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 300ms ease, background 300ms ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Next arrow */}
        <button
          onClick={next}
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

// Separate component so it can use a layout effect to measure card width
// and apply the correct translateX to the track element imperatively.
// This avoids any inline style recalculation issues with CSS custom properties.
function TrackDriver({
  trackRef,
  current,
  total,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>
  current: number
  total: number
}) {
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const firstCard = track.firstElementChild as HTMLElement | null
    if (!firstCard) return
    const cardWidth = firstCard.offsetWidth + 12 // card + gap
    track.style.transform = `translateX(-${current * cardWidth}px)`
  }, [current, trackRef, total])

  // Also recalculate on resize
  useEffect(() => {
    const handler = () => {
      const track = trackRef.current
      if (!track) return
      const firstCard = track.firstElementChild as HTMLElement | null
      if (!firstCard) return
      const cardWidth = firstCard.offsetWidth + 12
      track.style.transform = `translateX(-${current * cardWidth}px)`
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [current, trackRef])

  return null
}
