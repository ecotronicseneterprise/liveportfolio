'use client'

import { useState, useEffect, useRef } from 'react'

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

const CARD_HEIGHT = 500
// Render at 960px (tablet width) — text is naturally larger relative to layout,
// making it more legible at the scaled-down preview sizes.
const IFRAME_WIDTH = 960
const ROTATE_MS = 4000

function Card({
  p,
  active,
  iframeScale,
  iframeHeight,
  cardWidth,
  slideIndex,
}: {
  p: ShowcasePortfolio
  active: boolean
  iframeScale: number
  iframeHeight: number
  cardWidth: number
  slideIndex: number
}) {
  const isDark = p.mode === 'dark'
  const barBg = isDark ? 'rgba(15,23,42,0.90)' : 'rgba(255,255,255,0.92)'
  const textPrimary = isDark ? '#F8FAFC' : '#0A0A0A'
  const textMuted = isDark ? '#94A3B8' : '#6B7280'
  const url = `https://liveportfolio.site/${p.slug}`

  return (
    <div
      onClick={() => window.open(url, '_blank')}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 16,
        overflow: 'hidden',
        border: isDark
          ? `1px solid rgba(255,255,255,0.07)`
          : `2px solid ${p.accent}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        opacity: active ? 1 : 0,
        zIndex: active ? 1 : 0,
        pointerEvents: active ? 'auto' : 'none',
        transition: 'opacity 600ms ease',
        background: isDark ? darkBg(p) : '#fff',
      }}
    >
      {/* Scaled iframe — always mounted; parent opacity handles visibility */}
      <div style={{ width: cardWidth, height: CARD_HEIGHT, overflow: 'hidden', position: 'relative' }}>
        <iframe
          src={url}
          title={`${p.name} portfolio`}
          scrolling="no"
          loading={slideIndex === 0 ? 'eager' : 'lazy'}
          style={{
            width: IFRAME_WIDTH,
            height: iframeHeight,
            border: 'none',
            transform: `scale(${iframeScale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            display: 'block',
          }}
        />
      </div>

      {/* Info bar pinned to bottom */}
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

export default function PortfolioShowcase() {
  const total = PORTFOLIOS.length
  const [index, setIndex] = useState(0)
  const pausedRef = useRef(false)
  const [iframeScale, setIframeScale] = useState(0.33)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const updateScale = () => {
      const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth
      // 32px total horizontal padding inside the card area
      const availableWidth = containerWidth - 32
      // Cap card width at 400px on large screens
      const effectiveWidth = Math.min(availableWidth, 400)
      setIframeScale(effectiveWidth / IFRAME_WIDTH)
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const advance = () => setIndex((i) => (i + 1) % total)
  const retreat = () => setIndex((i) => (i - 1 + total) % total)

  const cardWidth = Math.round(IFRAME_WIDTH * iframeScale)
  const actualScale = cardWidth / IFRAME_WIDTH
  const iframeHeight = Math.round(CARD_HEIGHT / actualScale)

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIndex(i => (i + 1) % PORTFOLIOS.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    pausedRef.current = true
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
    pausedRef.current = false
  }

  return (
    <div className="w-full border-t border-gray-100 py-10 sm:py-14">
      {/* Stacked crossfade slideshow */}
      <div
        ref={containerRef}
        className="px-4 sm:px-10 lg:px-16"
        style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflow: 'hidden' }}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            position: 'relative',
            height: CARD_HEIGHT,
            width: cardWidth,
            margin: '0 auto',
          }}
        >
          {PORTFOLIOS.map((p, i) => (
            <Card
              key={p.slug}
              p={p}
              active={i === index}
              iframeScale={actualScale}
              iframeHeight={iframeHeight}
              cardWidth={cardWidth}
              slideIndex={i}
            />
          ))}
        </div>
      </div>

      {/* Dots + arrows */}
      <div className="mt-6 px-4 sm:px-10 lg:px-16">
        <div style={{ maxWidth: cardWidth, margin: '0 auto' }}>
          <div className="flex items-center justify-center gap-3">
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
                  onClick={() => { setIndex(i); pausedRef.current = false }}
                  aria-label={`Go to ${p.name}`}
                  style={{
                    width: i === index ? 20 : 6,
                    height: 6,
                    borderRadius: 99,
                    background: i === index ? PORTFOLIOS[index].accent : '#D1D5DB',
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
      </div>
    </div>
  )
}
