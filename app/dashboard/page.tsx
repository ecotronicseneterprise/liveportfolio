'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import type { PortfolioContent } from '@/components/templates/Minimal'
import Logo from '@/components/Logo'
import UpgradeModal from '@/components/UpgradeModal'
import ImageCropper from '@/components/ImageCropper'
import LiveToast, { pushLiveToast } from '@/components/LiveToast'

interface UserProfile {
  id: string
  email: string
  slug: string
  plan: string
  published_at: string | null
  custom_domain: string | null
}

interface Portfolio {
  id: string
  template: string
  content: PortfolioContent
  health_score: number
  view_count: number
  last_viewed_at: string | null
  updated_at: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

// ── Pulse keyframes injected once ────────────────────────────────────────────
const PULSE_STYLE = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`

// ── Lock icon SVG ────────────────────────────────────────────────────────────
function LockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

// ── Frosted blur overlay — single tap opens upgrade modal ────────────────────
function ProBlurOverlay({ subtext, onUpgrade }: {
  headline?: string
  subtext: string
  onUpgrade: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        background: 'rgba(255,255,255,0.55)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        textAlign: 'center',
        padding: '16px',
        borderRadius: 'inherit',
        zIndex: 10,
      }}
    >
      <LockIcon size={24} />
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Pro feature</p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, maxWidth: 220, lineHeight: 1.5 }}>{subtext}</p>
      <button
        onClick={onUpgrade}
        style={{
          padding: '8px 16px',
          background: '#0A66C2',
          color: '#fff',
          border: 'none',
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Unlock with Pro →
      </button>
    </div>
  )
}

// ── Career Score card — circular ring, Pro only ──────────────────────────────
interface CareerScoreData {
  score: number
  breakdown: { presence: number; projects: number; experience: number; skills: number }
  summary: string
  scored_at: string
  cached: boolean
}

function CareerScoreCard({
  isPro,
  portfolioId,
  userId,
  token,
  onUpgrade,
}: {
  isPro: boolean
  portfolioId: string
  userId: string
  token: string
  onUpgrade: () => void
}) {
  const [data, setData] = useState<CareerScoreData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isPro || !token) return
    setLoading(true)
    fetch(`/api/score?portfolioId=${portfolioId}&userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.score !== undefined) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isPro, portfolioId, userId, token])

  // Circular ring metrics
  const RADIUS = 36
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const displayScore = isPro ? (data?.score ?? 0) : 72 // PLACEHOLDER for Basic
  const strokeDashoffset = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE

  return (
    <div
      className="col-span-full bg-white rounded-2xl p-5"
      style={{ position: 'relative', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>AI career score</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isPro && data ? (data.cached ? 'Cached · refreshes weekly' : 'Just scored') : 'Scored weekly by AI'}
          </p>
        </div>
        {isPro && data && (
          <span className="text-xs bg-[#E8F0F9] text-[#0A66C2] px-2.5 py-1 rounded-full font-medium">
            {new Date(data.scored_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular ring */}
        <div className="flex-shrink-0 relative">
          <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={48} cy={48} r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth={8} />
            <circle
              cx={48} cy={48} r={RADIUS}
              fill="none"
              stroke="#0A66C2"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={loading ? CIRCUMFERENCE : strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="text-xl font-bold text-gray-900">{loading ? '…' : displayScore}</span>
            <span className="text-[10px] text-gray-400">/ 100</span>
          </div>
        </div>

        {/* Breakdown bars */}
        {isPro && data ? (
          <div className="flex-1 w-full space-y-2">
            {[
              { label: 'Online presence', value: data.breakdown.presence, max: 25 },
              { label: 'Project impact', value: data.breakdown.projects, max: 35 },
              { label: 'Experience', value: data.breakdown.experience, max: 25 },
              { label: 'Skills', value: data.breakdown.skills, max: 15 },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className="text-xs text-gray-400">{value}/{max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A66C2] rounded-full"
                    style={{ width: `${Math.round((value / max) * 100)}%`, transition: 'width 0.8s ease' }}
                  />
                </div>
              </div>
            ))}
            {data.summary && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-50 mt-2">{data.summary}</p>
            )}
          </div>
        ) : (
          /* PLACEHOLDER breakdown for Basic */
          <div className="flex-1 w-full space-y-2">
            {[
              { label: 'Online presence', value: 18, max: 25 },
              { label: 'Project impact', value: 28, max: 35 },
              { label: 'Experience', value: 16, max: 25 },
              { label: 'Skills', value: 10, max: 15 },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className="text-xs text-gray-400">{value}/{max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A66C2] rounded-full"
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-50 mt-2">
              Add quantified outcomes to your projects to push your score above 80.
            </p>
          </div>
        )}
      </div>

      {/* Blur overlay for Basic users */}
      {!isPro && (
        <ProBlurOverlay
          headline="Your AI career score"
          subtext="Scored weekly — see exactly where to improve"
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  )
}

// ── Portfolio strength bar ───────────────────────────────────────────────────
function HealthScore({ score }: { score: number }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio strength</span>
        <span className="text-xl font-bold text-[#0A66C2]">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-[#0A66C2]"
          style={{ width: `${score}%` }}
        />
      </div>
      {score < 80 && (
        <p className="text-xs text-gray-400 mt-3">
          Add a profile photo, GitHub, and 3+ projects to reach 80+
        </p>
      )}
    </div>
  )
}

// ── Analytics section — shown to all published users, blurred for Basic ──────
// PLACEHOLDER bar chart heights shown to Basic users only
const PLACEHOLDER_BARS = [30, 50, 40, 70, 55, 90, 75]
const PLACEHOLDER_SOURCES = [
  { label: 'LinkedIn', pct: 62 },
  { label: 'Direct', pct: 21 },
  { label: 'WhatsApp', pct: 17 },
]
const PLACEHOLDER_ACTIVITY: ActivityEvent[] = [
  { event_type: 'portfolio_view', label: null, country: 'Nigeria', time: '2h ago' },
  { event_type: 'portfolio_view', label: null, country: 'Ghana', time: '5h ago' },
  { event_type: 'link_click', label: 'GitHub', country: null, time: '1d ago' },
]

interface ActivityEvent {
  event_type: string
  label: string | null
  country: string | null
  referrer_source?: string | null
  device_type?: string | null
  time: string
}

interface AnalyticsSummary {
  viewsByDay: number[]
  dayLabels?: string[]
  chartPeriod?: string
  topSources: { label: string; pct: number }[]
  recentActivity: ActivityEvent[]
  totalViews: number
  totalUniqueVisitors: number
  eventCount: number
}

function AnalyticsSection({
  isPro,
  portfolioId,
  userId,
  token,
  onUpgrade,
  onSummaryLoaded,
  onActivityLoaded,
  onCopyLink,
}: {
  isPro: boolean
  portfolioId: string
  userId: string
  token: string
  onUpgrade: () => void
  onSummaryLoaded?: (totalViews: number, totalUniqueVisitors: number) => void
  onActivityLoaded?: (activity: ActivityEvent[]) => void
  onCopyLink: () => void
}) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    if (!isPro || !token || !portfolioId || !userId) return
    console.log('[analytics] fetching for portfolioId:', portfolioId)
    fetch(`/api/analytics/summary?portfolioId=${portfolioId}&userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d: AnalyticsSummary) => {
        if (!d.viewsByDay) return // guard against error responses
        setSummary(d)
        onSummaryLoaded?.(d.totalViews ?? 0, d.totalUniqueVisitors ?? 0)
        onActivityLoaded?.(d.recentActivity ?? [])
      })
      .catch(() => {})
  }, [isPro, portfolioId, userId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const bars = isPro && summary ? summary.viewsByDay : PLACEHOLDER_BARS
  const barLabels = isPro && summary?.dayLabels ? summary.dayLabels : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const maxBar = Math.max(...bars, 1)
  const sources = isPro && summary ? summary.topSources : PLACEHOLDER_SOURCES
  const activity = isPro && summary ? summary.recentActivity : PLACEHOLDER_ACTIVITY

  function timeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return (
    <div className="col-span-full bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <h3 style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Portfolio analytics</h3>
        {isPro && (
          <span className="text-xs bg-[#E8F0F9] text-[#0A66C2] px-2.5 py-1 rounded-full font-medium">
            Last 7 days
          </span>
        )}
      </div>

      {/* Content area — blurred for Basic */}
      <div style={{ position: 'relative' }}>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Left — Views over time bar chart */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Portfolio views</p>
            <div className="flex items-end gap-1.5 h-32" style={{ position: 'relative' }}>
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%', position: 'relative' }}>
                  {h > 0 && (
                    <span style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2, lineHeight: 1 }}>{h}</span>
                  )}
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.round((h / maxBar) * 100)}%`,
                      minHeight: h > 0 ? 4 : 0,
                      background: isPro ? '#1D9E75' : 'rgba(29, 158, 117, 0.7)',
                      transition: 'height 0.5s ease',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {barLabels.map((d, i) => (
                <span key={i} className="flex-1 text-center text-xs text-gray-300">{d}</span>
              ))}
            </div>
          </div>

          {/* Right — Top sources */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Top sources</p>
            <div className="space-y-3">
              {sources.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 font-medium">{s.label}</span>
                    <span className="text-xs text-gray-400">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0A66C2] rounded-full"
                      style={{ width: `${s.pct}%`, opacity: isPro ? 1 : 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent visitors */}
        <div className="px-5 pb-5">
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Recent visitors</p>
          {activity.length === 0 ? (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                No visits recorded yet. Share your portfolio link to start tracking visitors.
              </p>
              <button
                onClick={onCopyLink}
                style={{ fontSize: 13, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Copy portfolio link →
              </button>
            </div>
          ) : (
            <div>
              {/* Most recent visit — prominent */}
              {(() => {
                const a = activity[0]
                const displayTime = typeof a.time === 'string' && a.time.includes('ago') ? a.time : timeAgo(a.time)
                const baseLabel = a.event_type === 'portfolio_view'
                  ? (a.country ? `Portfolio visit · ${a.country}` : 'Portfolio visit')
                  : (a.label ?? a.event_type.replace(/_/g, ' '))
                const via = a.referrer_source ? ` · via ${a.referrer_source}` : ''
                const deviceLabel = a.device_type === 'mobile' ? ' 📱' : a.device_type === 'tablet' ? ' 📱' : ''
                return (
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Most recent visit</p>
                    <p className="text-sm font-semibold text-gray-800">{baseLabel}{via}{deviceLabel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{displayTime}</p>
                  </div>
                )
              })()}

              {/* Remaining unique visitors */}
              {activity.slice(1).map((a, i) => {
                const displayTime = typeof a.time === 'string' && a.time.includes('ago') ? a.time : timeAgo(a.time)
                const baseLabel = a.event_type === 'portfolio_view'
                  ? (a.country ? `Portfolio visit · ${a.country}` : 'Portfolio visit')
                  : (a.label ?? a.event_type.replace(/_/g, ' '))
                const via = a.referrer_source ? ` · via ${a.referrer_source}` : ''
                const deviceLabel = a.device_type === 'mobile' ? ' 📱' : a.device_type === 'tablet' ? ' 📱' : ''
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-t border-gray-50">
                    <span className="text-xs text-gray-600">· {baseLabel}{via}{deviceLabel}</span>
                    <span className="text-xs text-gray-300 ml-3 flex-shrink-0">{displayTime}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Blur overlay for Basic users — sits over content only, not header */}
        {!isPro && (
          <ProBlurOverlay
            headline="See who's viewing your portfolio"
            subtext="Traffic sources, link clicks, recent activity — unlock with Pro"
            onUpgrade={onUpgrade}
          />
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  let supabase: ReturnType<typeof getSupabaseClient>
  try {
    supabase = getSupabaseClient()
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white border border-gray-100 rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Setup required</h1>
          <p className="text-sm text-gray-600">
            Supabase env vars are missing. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on your deployment, then reload.
          </p>
        </div>
      </div>
    )
  }

  const [user, setUser] = useState<UserProfile | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [template, setTemplate] = useState<string>('minimal')
  const [previewTemplate, setPreviewTemplate] = useState<string>('minimal')
  const [lockedTemplateMsg, setLockedTemplateMsg] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<Partial<PortfolioContent>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'settings'>('overview')
  const [userPlan, setUserPlan] = useState<'free' | 'basic' | 'pro'>('free')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')
  const [analyticsViews, setAnalyticsViews] = useState<number | null>(null)
  const [uniqueVisitors, setUniqueVisitors] = useState<number | null>(null)
  const [latestActivity, setLatestActivity] = useState<ActivityEvent[]>([])
  const [accessToken, setAccessToken] = useState<string>('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarCropperSrc, setAvatarCropperSrc] = useState<string | null>(null)
  const [projectImageCropperSrc, setProjectImageCropperSrc] = useState<string | null>(null)
  const [projectImageCropperIndex, setProjectImageCropperIndex] = useState<number>(0)
  const [projectImageUploading, setProjectImageUploading] = useState<number | null>(null)
  const [projectImageMsgs, setProjectImageMsgs] = useState<Record<number, { type: 'ok' | 'err'; text: string }>>({})
  const [projectImagePreviews, setProjectImagePreviews] = useState<Record<number, string>>({})
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/create'); return }
      setAccessToken(session.access_token)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: userData } = await sb
        .from('users')
        .select('id, email, slug, plan, published_at, custom_domain')
        .eq('id', session.user.id)
        .single()

      if (!userData) { router.push('/create'); return }
      setUser(userData)

      // Fetch plan via server-side getUserPlan (handles subscriptions + legacy users)
      const planRes = await fetch(`/api/user-plan?userId=${session.user.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const { plan } = await planRes.json()
      setUserPlan(plan as 'free' | 'basic' | 'pro')

      const { data: portfolioData } = await sb
        .from('portfolios')
        .select('id, template, content, health_score, view_count, last_viewed_at, updated_at')
        .eq('user_id', session.user.id)
        .single()

      if (!portfolioData) { router.push('/create'); return }
      setPortfolio(portfolioData as Portfolio)
      setTemplate((portfolioData.template as string) || 'minimal')
      setPreviewTemplate((portfolioData.template as string) || 'minimal')
      setEditContent(portfolioData.content as PortfolioContent)
    } catch (err) {
      console.error('[dashboard] loadData failed:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'edit') return
      loadData()
    }
    window.addEventListener('focus', handleFocus)
    return () => { window.removeEventListener('focus', handleFocus) }
  }, [loadData, activeTab])

  // Supabase Realtime — live toast when a new portfolio_view arrives for the Pro user
  // NOTE: Realtime must be enabled for the analytics_events table in the Supabase dashboard
  // (Table Editor → analytics_events → Realtime toggle ON) for this to fire.
  useEffect(() => {
    if (!portfolio?.id || userPlan !== 'pro') return

    const channel = supabase
      .channel(`live-views-${portfolio.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `portfolio_id=eq.${portfolio.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const ev = payload.new
          if (ev.event_type !== 'portfolio_view') return
          const country = typeof ev.country === 'string' ? ev.country : null
          const ref = typeof ev.referrer === 'string' ? ev.referrer : null
          let via = ''
          if (ref) {
            if (ref.includes('linkedin')) via = ' · via LinkedIn'
            else if (ref.includes('wa.me') || ref.includes('whatsapp')) via = ' · via WhatsApp'
            else if (ref.includes('twitter') || ref.includes('x.com') || ref.includes('t.co')) via = ' · via Twitter/X'
            else if (ref.includes('github')) via = ' · via GitHub'
            else if (ref.includes('google')) via = ' · via Google'
          }
          const device = typeof ev.device_type === 'string' && (ev.device_type === 'mobile' || ev.device_type === 'tablet') ? ' 📱' : ''
          const msg = country
            ? `Someone from ${country} just viewed your portfolio${via}${device}`
            : `Someone just viewed your portfolio${via}${device}`
          pushLiveToast(msg)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [portfolio?.id, userPlan]) // eslint-disable-line react-hooks/exhaustive-deps

  // Open cropper on file select
  const handleAvatarUpload = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setAvatarMsg({ type: 'err', text: 'Only JPEG, PNG, or WebP files are accepted.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarMsg({ type: 'err', text: 'Photo must be under 10MB.' })
      return
    }
    setAvatarCropperSrc(URL.createObjectURL(file))
  }

  // Called after crop — uploads via server-side route (admin client bypasses RLS)
  const handleAvatarCropped = useCallback(async (blob: Blob) => {
    setAvatarCropperSrc(null)
    setAvatarUploading(true)
    setAvatarMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setAvatarMsg({ type: 'err', text: 'Session expired.' }); return }

      const formData = new FormData()
      formData.append('file', blob, 'avatar.jpg')

      const uploadRes = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      if (!uploadRes.ok) {
        const { error } = await uploadRes.json()
        throw new Error(error || 'Upload failed')
      }
      const { url: newUrl } = await uploadRes.json()

      const res = await fetch('/api/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: { ...editContent, avatar_url: newUrl } }),
      })
      if (!res.ok) throw new Error('Failed to update portfolio')
      setEditContent((prev) => ({ ...prev, avatar_url: newUrl }))
      setAvatarPreview(newUrl)
      setAvatarMsg({ type: 'ok', text: 'Photo updated' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[avatar upload]', msg)
      setAvatarMsg({ type: 'err', text: `Upload failed: ${msg.slice(0, 120)}` })
    } finally {
      setAvatarUploading(false)
    }
  }, [editContent, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectImageCropped = useCallback(async (blob: Blob) => {
    setProjectImageCropperSrc(null)
    const idx = projectImageCropperIndex
    setProjectImageUploading(idx)
    setProjectImageMsgs((prev) => { const n = { ...prev }; delete n[idx]; return n })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setProjectImageMsgs((prev) => ({ ...prev, [idx]: { type: 'err', text: 'Session expired.' } }))
        return
      }

      const formData = new FormData()
      formData.append('file', blob, 'project.jpg')
      formData.append('index', String(idx))

      const uploadRes = await fetch('/api/upload-project-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      if (!uploadRes.ok) {
        const { error } = await uploadRes.json()
        throw new Error(error || 'Upload failed')
      }
      const { url: newUrl } = await uploadRes.json()

      const updatedProjects = [...(editContent.projects || [])]
      updatedProjects[idx] = { ...updatedProjects[idx], image_url: newUrl }
      const res = await fetch('/api/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ content: { ...editContent, projects: updatedProjects } }),
      })
      if (!res.ok) throw new Error('Failed to update portfolio')
      setEditContent((prev) => ({ ...prev, projects: updatedProjects }))
      setProjectImagePreviews((prev) => ({ ...prev, [idx]: URL.createObjectURL(blob) }))
      setProjectImageMsgs((prev) => ({ ...prev, [idx]: { type: 'ok', text: 'Image updated' } }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[project image upload]', msg)
      setProjectImageMsgs((prev) => ({ ...prev, [idx]: { type: 'err', text: `Upload failed: ${msg.slice(0, 120)}` } }))
    } finally {
      setProjectImageUploading(null)
    }
  }, [projectImageCropperIndex, editContent, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!portfolio) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: editContent, template }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPortfolio((prev) => prev ? { ...prev, health_score: updated.health_score } : prev)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setSaveError('Failed to save. Please try again.')
      }
    } catch (err) {
      console.error('[dashboard] handleSave failed:', err)
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = () => {
    if (!user) return
    navigator.clipboard.writeText(`https://liveportfolio.site/${user.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleChangePassword = async () => {
    setPasswordMsg(null)
    if (passwordForm.next.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    setChangingPassword(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPasswordMsg({ type: 'err', text: 'Session expired. Please sign in again.' }); setChangingPassword(false); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: session.user.email!, password: passwordForm.current })
    if (signInError) {
      setPasswordMsg({ type: 'err', text: 'Current password is incorrect.' })
      setChangingPassword(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
    if (error) {
      setPasswordMsg({ type: 'err', text: error.message })
    } else {
      setPasswordMsg({ type: 'ok', text: 'Password updated successfully.' })
      setPasswordForm({ current: '', next: '', confirm: '' })
    }
    setChangingPassword(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      setDeleteMsg('Type your email address exactly to confirm.')
      return
    }
    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setDeleteMsg('Session expired. Please sign in again.'); setDeletingAccount(false); return }
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) { const d = await res.json(); setDeleteMsg(d.error || 'Failed to delete account.'); setDeletingAccount(false); return }
      await supabase.auth.signOut()
      router.push('/?deleted=1')
    } catch {
      setDeleteMsg('Something went wrong. Please try again.')
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p style={{ color: '#6B7280', fontSize: 15 }}>
          Failed to load your dashboard.
        </p>
        <button
          onClick={() => { setLoadError(false); loadData() }}
          style={{
            padding: '10px 24px',
            background: '#0A66C2',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!user || !portfolio) return null

  const portfolioUrl = `https://liveportfolio.site/${user.slug}`
  const isPublished = userPlan !== 'free'
  const isPro = userPlan === 'pro'

  // Plan badge styles
  const planBadge =
    userPlan === 'pro'
      ? { bg: '#E8F0F9', text: '#0A66C2', label: 'Pro' }
      : userPlan === 'basic'
      ? { bg: '#E8F0F9', text: '#0A66C2', label: 'Basic' }
      : { bg: '#f3f4f6', text: '#6b7280', label: 'Free' }

  return (
    <>
    <style>{PULSE_STYLE}</style>
    {avatarCropperSrc && (
      <ImageCropper
        src={avatarCropperSrc}
        aspectRatio={1}
        onCrop={handleAvatarCropped}
        onCancel={() => setAvatarCropperSrc(null)}
      />
    )}
    {projectImageCropperSrc && (
      <ImageCropper
        src={projectImageCropperSrc}
        aspectRatio={16 / 9}
        onCrop={handleProjectImageCropped}
        onCancel={() => setProjectImageCropperSrc(null)}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user.email}
        portfolioId={portfolio.id}
      />

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8 pb-[72px] md:pb-8">

        {/* Identity header */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar — 64px circle */}
            <div className="flex-shrink-0">
              {(avatarPreview || editContent.avatar_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview || editContent.avatar_url || ''} alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border border-gray-100" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#E8F0F9] flex items-center justify-center border border-gray-100">
                  <span className="text-xl font-bold text-[#0A66C2]">{user.email[0].toUpperCase()}</span>
                </div>
              )}
            </div>
            {/* Name + role — left on desktop, centered on mobile */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {(editContent as Record<string, string>).name || user.email.split('@')[0]}
              </h1>
              <p className="text-[0.95rem] text-gray-500 mt-0.5">
                {(editContent as Record<string, string>).role || ''}
              </p>
            </div>
            {/* Right side — URL chip + plan badge + CTA */}
            <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              {isPublished ? (
                <a href={portfolioUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[#0A66C2] font-medium px-3 py-1 bg-[#E8F0F9] rounded-full hover:bg-[#d4e4f7] transition-colors">
                  liveportfolio.site/{user.slug} ↗
                </a>
              ) : (
                <span className="text-sm text-gray-400 px-3 py-1 bg-gray-50 rounded-full">
                  liveportfolio.site/{user.slug}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: planBadge.bg, color: planBadge.text }}>
                  {planBadge.label}
                </span>
                <button
                  onClick={() => loadData()}
                  title="Refresh"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 4, fontSize: 12 }}
                >
                  ↻
                </button>
                {isPublished ? (
                  <a href={portfolioUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:border-gray-300 transition-colors">
                    View live →
                  </a>
                ) : (
                  <button onClick={() => setShowUpgradeModal(true)}
                    className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors">
                    Publish →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — active: blue underline + blue text — desktop only */}
        <div className="hidden md:flex mb-6 bg-white border border-gray-100 rounded-xl overflow-hidden w-fit">
          {(['overview', 'edit', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                color: activeTab === tab ? '#0A66C2' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #0A66C2' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab === 'overview' ? 'My Portfolio' : tab === 'edit' ? 'Edit Content' : 'Account'}
            </button>
          ))}
        </div>

        {/* Mobile bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden" style={{ minHeight: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {([
            { key: 'overview', label: 'My Portfolio', icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            )},
            { key: 'edit', label: 'Edit Content', icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            )},
            { key: 'settings', label: 'Account', icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )},
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: activeTab === key ? '#0A66C2' : '#6b7280' }}
            >
              {icon}
              <span style={{ fontSize: 12, fontWeight: activeTab === key ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">

            {/* CHANGE 1: Latest visitor hero card — Pro only */}
            {isPro && isPublished && (() => {
              const latest = latestActivity[0]
              if (!latest) {
                return (
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>Share your portfolio link to start tracking visitors.</span>
                  </div>
                )
              }
              const isView = latest.event_type === 'portfolio_view'
              const primaryText = isView
                ? (latest.country ? `Someone from ${latest.country} viewed your portfolio` : 'Someone viewed your portfolio')
                : (latest.label ? `Someone clicked ${latest.label}` : 'Someone interacted with your portfolio')
              const viaText = latest.referrer_source ? ` · via ${latest.referrer_source}` : ''
              const deviceText = latest.device_type === 'mobile' || latest.device_type === 'tablet' ? ' 📱' : ''
              const displayTime = typeof latest.time === 'string' && latest.time.includes('ago')
                ? latest.time
                : (() => {
                  const diff = Date.now() - new Date(latest.time).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 1) return 'just now'
                  if (mins < 60) return `${mins}m ago`
                  const hours = Math.floor(mins / 60)
                  if (hours < 24) return `${hours}h ago`
                  return `${Math.floor(hours / 24)}d ago`
                })()
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    background: '#10B981',
                    borderRadius: '50%',
                    flexShrink: 0,
                    animation: 'pulse 2s infinite',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.4 }}>{primaryText}{viaText}{deviceText}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{displayTime}</p>
                  </div>
                  <span style={{
                    background: 'rgba(16,185,129,0.1)',
                    color: '#059669',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 99,
                    flexShrink: 0,
                  }}>Live</span>
                </div>
              )
            })()}

            {/* CHANGE 1: Basic upgrade prompt (no latest visitor data yet) */}
            {!isPro && isPublished && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(10,102,194,0.05), rgba(10,102,194,0.02))',
                border: '1px solid rgba(10,102,194,0.15)',
                borderRadius: 12,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <LockIcon size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>See who&apos;s viewing your portfolio in real time</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Country, referrer source, and recent activity — Pro only</p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={{ background: '#0A66C2', color: '#fff', border: 'none', borderRadius: 99, fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer', flexShrink: 0 }}
                >
                  Unlock →
                </button>
              </div>
            )}

            {/* CHANGE 2: Compact 3-column stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* Page Views (30d) — FIX 6: from analytics_events, same window as Visitors */}
              <div style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', display: 'block', lineHeight: 1 }}>
                  {isPro && analyticsViews !== null ? analyticsViews : portfolio.view_count}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, display: 'block' }}>Page Views (30d)</span>
              </div>
              {/* Unique Visitors (30d) — FIX 6 */}
              <div
                onClick={!isPro ? () => setShowUpgradeModal(true) : undefined}
                style={{
                  background: isPro ? 'white' : '#F9FAFB',
                  border: isPro ? '1px solid #E5E7EB' : '1px dashed #D1D5DB',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  boxShadow: isPro ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  cursor: isPro ? 'default' : 'pointer',
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', display: 'block', lineHeight: 1 }}>
                  {isPro && uniqueVisitors !== null ? uniqueVisitors : '—'}
                </span>
                {!isPro && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginBottom: 2 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, display: 'block' }}>Unique Visitors (30d)</span>
              </div>
              {/* Score */}
              <div style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', display: 'block', lineHeight: 1 }}>{portfolio.health_score}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, display: 'block' }}>Score</span>
              </div>
            </div>

            {/* Share — available to all published users */}
            {isPublished && (
              <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Share your portfolio</p>

                <div className="flex flex-col sm:flex-row gap-5">
                  {/* QR code — Pro: real QR; Basic: blurred placeholder QR */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2" style={{ position: 'relative' }}>
                    {isPro ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=1`}
                          alt="Portfolio QR code"
                          width={140}
                          height={140}
                          className="rounded-xl border border-gray-100"
                        />
                        <button
                          onClick={async () => {
                            try {
                              const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=2&format=png`
                              const res = await fetch(url)
                              if (!res.ok) throw new Error('QR fetch failed')
                              const blob = await res.blob()
                              const a = document.createElement('a')
                              a.href = URL.createObjectURL(blob)
                              a.download = `${user.slug}-portfolio-qr.png`
                              a.click()
                            } catch (err) {
                              console.error('[qr] Download failed:', err)
                            }
                          }}
                          className="text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
                        >
                          Download QR →
                        </button>
                      </>
                    ) : (
                      <div style={{ position: 'relative', width: 140, overflow: 'hidden', borderRadius: 12 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('https://liveportfolio.site/upgrade')}&color=0A66C2&bgcolor=ffffff&qzone=1`}
                          alt=""
                          width={140}
                          height={140}
                          className="rounded-xl border border-gray-100"
                          aria-hidden="true"
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            background: 'rgba(255,255,255,0.55)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            borderRadius: 12,
                          }}
                        >
                          <LockIcon size={18} />
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#0A66C2', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 99 }}
                          >
                            Pro only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Share buttons */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-3">
                      {isPro ? 'Print your QR code and add it to your CV, business card, or email signature.' : 'Copy your link and share it anywhere.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copyLink}
                        className="text-sm px-4 py-2 bg-[#0A66C2] text-white rounded-full hover:bg-[#084D9A] transition-colors font-medium"
                      >
                        {copied ? '✓ Copied' : 'Copy link'}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Check out my professional portfolio: ${portfolioUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14, padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14, padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}
                      >
                        LinkedIn
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my professional portfolio at ${portfolioUrl} — built with liveportfolio.site`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14, padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}
                      >
                        X / Twitter
                      </a>
                      <a
                        href={`mailto:?subject=My professional portfolio&body=Hi, check out my portfolio: ${portfolioUrl}`}
                        style={{ fontSize: 14, padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}
                      >
                        Email
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Career score — Pro: real AI score; Basic: blurred placeholder */}
            {isPublished && (
              <CareerScoreCard
                isPro={isPro}
                portfolioId={portfolio.id}
                userId={user.id}
                token={accessToken}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            )}

            {/* Analytics — blurred preview for Basic, full data for Pro */}
            {isPublished && portfolio?.id && (
              <AnalyticsSection
                isPro={isPro}
                portfolioId={portfolio.id}
                userId={user.id}
                token={accessToken}
                onUpgrade={() => setShowUpgradeModal(true)}
                onSummaryLoaded={(views, visitors) => { setAnalyticsViews(views); setUniqueVisitors(visitors) }}
                onActivityLoaded={(a) => setLatestActivity(a)}
                onCopyLink={copyLink}
              />
            )}

            {/* Unpublished CTA */}
            {!isPublished && (
              <div className="bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-2xl p-5 text-center">
                <p className="text-sm font-semibold text-gray-800 mb-1">Your portfolio is ready to publish.</p>
                <p className="text-sm text-gray-500 mb-4">Go live and start tracking who finds you.</p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-block px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-bold rounded-full hover:bg-[#084D9A] transition-colors"
                >
                  Publish your portfolio — choose your plan →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {activeTab === 'edit' && userPlan === 'free' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-14 h-14 bg-[#E8F0F9] rounded-full flex items-center justify-center mx-auto mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Publish to unlock editing</h2>
              <p className="text-sm text-gray-500 mb-6">
                Publish your portfolio to edit your bio, projects, and links anytime — changes go live instantly.
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-block px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
              >
                Publish my portfolio — choose your plan →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'edit' && userPlan !== 'free' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit your portfolio</h2>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
                </button>
                {saveError && (
                  <p style={{ color: '#EF4444', fontSize: 13, marginTop: 4 }}>{saveError}</p>
                )}
              </div>
            </div>

            {/* Template switcher — all 10, Pro gated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              {/* Template preview card */}
              {(() => {
                const TEMPLATE_DEMOS: Record<string, string> = {
                  'developer': 'https://liveportfolio.site/james-chen',
                  'designer': 'https://liveportfolio.site/sofia-martinez',
                  'data-scientist': 'https://liveportfolio.site/fatima-hassan',
                  'product-manager': 'https://liveportfolio.site/david-mensah',
                  'finance': 'https://liveportfolio.site/michael-roberts',
                  'creative': 'https://liveportfolio.site/priya-sharma',
                  'cybersecurity': 'https://liveportfolio.site/elena-vasquez',
                  'graduate': 'https://liveportfolio.site/chidi-okafor',
                  'minimal': 'https://liveportfolio.site/amara',
                  'bold': 'https://liveportfolio.site/emeka',
                }
                const TEMPLATE_DESCS: Record<string, string> = {
                  'developer': 'Dark, technical. Built for engineers.',
                  'designer': 'Editorial, light. Built for creatives.',
                  'data-scientist': 'Teal, data-focused. For analysts.',
                  'product-manager': 'Clean, structured. For PMs.',
                  'finance': 'Navy, formal. For finance professionals.',
                  'creative': 'Warm editorial. For brand and content.',
                  'cybersecurity': 'Dark green. For security engineers.',
                  'graduate': 'Clean, minimal. For recent graduates.',
                  'minimal': 'Minimal, works for any role.',
                  'bold': 'Bold dark mode, developer style.',
                }
                const displayName = previewTemplate.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ')
                const desc = TEMPLATE_DESCS[previewTemplate] ?? ''
                const demoUrl = TEMPLATE_DEMOS[previewTemplate]
                const isCurrent = previewTemplate === template
                return (
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>{displayName}</p>
                        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{desc}</p>
                      </div>
                      {isCurrent ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', background: '#F3F4F6', padding: '4px 10px', borderRadius: 99, flexShrink: 0 }}>
                          Current template
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            setTemplate(previewTemplate)
                            await handleSave()
                          }}
                          disabled={saving}
                          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#0A66C2', border: 'none', borderRadius: 99, padding: '6px 14px', cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: saving ? 0.6 : 1 }}
                        >
                          Apply this template →
                        </button>
                      )}
                    </div>
                    {demoUrl && (
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: '#0A66C2', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View example →
                      </a>
                    )}
                  </div>
                )
              })()}
              {lockedTemplateMsg && (
                <div className="mb-3 p-3 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-xl text-xs text-[#0A66C2] font-medium flex items-center justify-between gap-3">
                  <span>{lockedTemplateMsg}</span>
                  <button onClick={() => { setLockedTemplateMsg(null); setShowUpgradeModal(true) }} className="underline flex-shrink-0">Upgrade →</button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { id: 'minimal', name: 'Minimal', dark: false, pro: false },
                  { id: 'bold', name: 'Bold', dark: true, pro: false },
                  { id: 'creative', name: 'Creative', dark: false, pro: false },
                  { id: 'developer', name: 'Developer', dark: true, pro: true },
                  { id: 'designer', name: 'Designer', dark: false, pro: true },
                  { id: 'data-scientist', name: 'Data Sci', dark: true, pro: true },
                  { id: 'product-manager', name: 'PM', dark: false, pro: true },
                  { id: 'finance', name: 'Finance', dark: true, pro: true },
                  { id: 'graduate', name: 'Graduate', dark: false, pro: true },
                  { id: 'cybersecurity', name: 'Cyber', dark: true, pro: true },
                ].map((t) => {
                  const isLocked = t.pro && !isPro
                  const isSelected = template === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (isLocked) {
                          setLockedTemplateMsg(`"${t.name}" is a Pro template.`)
                          return
                        }
                        setLockedTemplateMsg(null)
                        setPreviewTemplate(t.id)
                        setTemplate(t.id)
                      }}
                      className="relative rounded-xl border-2 p-3 text-left transition-all"
                      style={{
                        background: isSelected ? '#E8F0F9' : t.dark ? '#0D1117' : '#F9FAFB',
                        borderColor: isSelected ? '#0A66C2' : '#e5e7eb',
                        opacity: isLocked ? 0.7 : 1,
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      {/* Colour swatch */}
                      <div
                        className="w-full rounded-lg mb-2 flex items-end justify-end p-1.5"
                        style={{
                          height: 36,
                          background: t.dark
                            ? 'linear-gradient(135deg, #1C2128 60%, #58A6FF 100%)'
                            : 'linear-gradient(135deg, #f3f4f6 60%, #0A66C2 100%)',
                        }}
                      >
                        {t.dark
                          ? <span style={{ fontSize: 8, color: '#58A6FF', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 600 }}>Dark</span>
                          : <span style={{ fontSize: 8, color: '#0A66C2', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 600 }}>Light</span>
                        }
                      </div>
                      <p className="font-semibold" style={{ fontSize: 14, color: isSelected ? '#0A66C2' : t.dark ? '#F9FAFB' : '#111827' }}>{t.name}</p>
                      {t.pro && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#0A66C2', color: '#fff' }}>
                          {isPro ? 'Pro' : '🔒'}
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-[#0A66C2] rounded-full flex items-center justify-center">
                          <span className="text-white text-[9px]">✓</span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid gap-4">
              {[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'role', label: 'Professional title', type: 'text' },
                { key: 'location', label: 'Location', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'github_url', label: 'GitHub URL', type: 'url' },
                { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
                { key: 'headline', label: 'Headline', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(editContent as Record<string, string>)[key] || ''}
                    onChange={(e) => setEditContent((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About / Bio</label>
                <textarea
                  value={editContent.about || ''}
                  onChange={(e) => setEditContent((prev) => ({ ...prev, about: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none" style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            {/* Project images */}
            {(editContent.projects?.length ?? 0) > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">Project images</label>
                <p className="text-xs text-gray-400 mb-3">16:9 crop · changes save immediately</p>
                <div className="space-y-3">
                  {(editContent.projects || []).map((p, idx) => {
                    const preview = projectImagePreviews[idx] || p.image_url || null
                    const isUploading = projectImageUploading === idx
                    const msg = projectImageMsgs[idx]
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-20 h-[45px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No image</span>
                            </div>
                          )}
                        </div>
                        {/* Project title + upload button */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate mb-1">{p.title || `Project ${idx + 1}`}</p>
                          <label className="cursor-pointer inline-block">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (!file.type.startsWith('image/')) return
                                if (file.size > 10 * 1024 * 1024) {
                                  setProjectImageMsgs((prev) => ({ ...prev, [idx]: { type: 'err', text: 'Image must be under 10MB.' } }))
                                  return
                                }
                                setProjectImageCropperIndex(idx)
                                setProjectImageCropperSrc(URL.createObjectURL(file))
                                e.target.value = ''
                              }}
                            />
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              isUploading
                                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'border-[#0A66C2] text-[#0A66C2] hover:bg-[#E8F0F9]'
                            }`}>
                              {isUploading ? (
                                <><span className="w-3 h-3 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />Uploading…</>
                              ) : preview ? 'Change' : 'Add image'}
                            </span>
                          </label>
                        </div>
                        {/* Inline status */}
                        {msg && (
                          <p className={`text-xs flex-shrink-0 font-medium ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                            {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(editContent.skills || []).map((skill, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setEditContent(prev => ({
                        ...prev,
                        skills: (prev.skills || []).filter((_, idx) => idx !== i)
                      }))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        padding: 12,
                        marginLeft: 2,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        boxSizing: 'content-box',
                      }}
                      aria-label={`Remove ${skill}`}
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a skill and press Enter"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                  style={{ fontSize: '16px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (!val) return
                      setEditContent(prev => ({ ...prev, skills: [...(prev.skills || []), val] }))
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
              </div>
            </div>

            {/* Experience */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Experience</label>
              <div className="space-y-4">
                {(editContent.experience || []).map((exp, i) => (
                  <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditContent(prev => ({
                          ...prev,
                          experience: (prev.experience || []).filter((_, idx) => idx !== i)
                        }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >Remove</button>
                    </div>
                    <input type="text" placeholder="Company" value={exp.company || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.experience || [])]
                        updated[i] = { ...updated[i], company: e.target.value }
                        setEditContent(prev => ({ ...prev, experience: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                    <input type="text" placeholder="Role / Title" value={exp.role || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.experience || [])]
                        updated[i] = { ...updated[i], role: e.target.value }
                        setEditContent(prev => ({ ...prev, experience: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                    <input type="text" placeholder="Period (e.g. 2023 – Present)" value={exp.period || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.experience || [])]
                        updated[i] = { ...updated[i], period: e.target.value }
                        setEditContent(prev => ({ ...prev, experience: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                    <textarea placeholder={"- Led team of 5 engineers...\n- Built payment integration..."}
                      value={(exp.bullets || []).join('\n')}
                      onChange={(e) => {
                        const updated = [...(editContent.experience || [])]
                        updated[i] = { ...updated[i], bullets: e.target.value.split('\n') }
                        setEditContent(prev => ({ ...prev, experience: updated }))
                      }}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none" style={{ fontSize: '16px' }} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditContent(prev => ({
                  ...prev,
                  experience: [...(prev.experience || []), { company: '', role: '', period: '', bullets: [] }]
                }))}
                className="mt-3 text-sm font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
              >+ Add experience</button>
            </div>

            {/* Projects */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Projects</label>
              <div className="space-y-4">
                {(editContent.projects || []).map((proj, i) => (
                  <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditContent(prev => ({
                          ...prev,
                          projects: (prev.projects || []).filter((_, idx) => idx !== i)
                        }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >Remove</button>
                    </div>
                    <input type="text" placeholder="Project title" value={proj.title || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.projects || [])]
                        updated[i] = { ...updated[i], title: e.target.value }
                        setEditContent(prev => ({ ...prev, projects: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                    <textarea placeholder="What did you build and why?" value={proj.solution || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.projects || [])]
                        updated[i] = { ...updated[i], solution: e.target.value }
                        setEditContent(prev => ({ ...prev, projects: updated }))
                      }}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none" style={{ fontSize: '16px' }} />
                    <input type="text" placeholder="Tech stack (React, Node.js, PostgreSQL)" value={(proj.stack || []).join(', ')}
                      onChange={(e) => {
                        const updated = [...(editContent.projects || [])]
                        updated[i] = { ...updated[i], stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                        setEditContent(prev => ({ ...prev, projects: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                    <input type="url" placeholder="Live URL (optional)" value={proj.url || ''}
                      onChange={(e) => {
                        const updated = [...(editContent.projects || [])]
                        updated[i] = { ...updated[i], url: e.target.value }
                        setEditContent(prev => ({ ...prev, projects: updated }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditContent(prev => ({
                  ...prev,
                  projects: [...(prev.projects || []), { title: '', problem: '', solution: '', outcome: '', stack: [], url: '' }]
                }))}
                className="mt-3 text-sm font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
              >+ Add project</button>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
              {saveError && (
                <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{saveError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="space-y-5">

            {/* Avatar upload — available to all plan types */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Profile photo</h2>
              <div className="flex items-center gap-5">
                {/* Current avatar or placeholder */}
                <div className="relative flex-shrink-0">
                  {(avatarPreview || editContent.avatar_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview || editContent.avatar_url || ''}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#E8F0F9] flex items-center justify-center border border-gray-100">
                      <span className="text-2xl font-bold text-[#0A66C2]">
                        {user.email[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Upload controls */}
                <div>
                  <label className="cursor-pointer inline-block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                      disabled={avatarUploading}
                    />
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      avatarUploading
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-[#0A66C2] text-[#0A66C2] hover:bg-[#E8F0F9]'
                    }`}>
                      {avatarUploading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
                          Uploading…
                        </>
                      ) : 'Update photo'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG, or WebP · max 2MB</p>
                  {avatarMsg && (
                    <p className={`text-xs mt-1.5 font-medium ${avatarMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {avatarMsg.type === 'ok' ? '✓ ' : ''}{avatarMsg.text}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <p className="text-sm text-gray-700">{user.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Portfolio URL</label>
                <p className="text-sm text-[#0A66C2] font-medium">https://liveportfolio.site/{user.slug}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Plan</label>
                <p className="text-sm text-gray-700 capitalize">
                  {userPlan !== 'free' ? `${planBadge.label} — published` : 'Free — unpublished'}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Sign out
                </button>
              </div>
            </div>

            {/* Change password */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Change password</h2>
              {passwordMsg && (
                <div className={`p-3 rounded-xl text-sm ${passwordMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {passwordMsg.text}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }}
                />
                <input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent" style={{ fontSize: '16px' }}
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.current || !passwordForm.next || !passwordForm.confirm}
                className="px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-40"
              >
                {changingPassword ? 'Updating…' : 'Update password'}
              </button>
            </div>

            {/* Delete account */}
            <div className="bg-white border border-red-100 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-red-600">Delete account</h2>
              <p className="text-sm text-gray-500">
                This permanently deletes your account, portfolio, and all data. If you have a published portfolio, it will go offline immediately. <strong>This cannot be undone.</strong>
              </p>
              {deleteMsg && (
                <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-100">{deleteMsg}</div>
              )}
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Type <strong className="text-gray-700 font-mono">{user.email}</strong> to confirm:</p>
                <input
                  type="email"
                  placeholder={user.email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" style={{ fontSize: '16px' }}
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirm !== user.email}
                className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-full hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deletingAccount ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
    <LiveToast />
    </>
  )
}
