'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import type { PortfolioContent } from '@/components/templates/Minimal'
import Logo from '@/components/Logo'
import UpgradeModal from '@/components/UpgradeModal'

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

// ── Lock icon SVG ────────────────────────────────────────────────────────────
function LockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

// ── Frosted blur overlay — sits over blurred preview content ─────────────────
function ProBlurOverlay({ headline, subtext, onUpgrade }: {
  headline: string
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
        gap: '8px',
        textAlign: 'center',
        padding: '16px',
        borderRadius: 'inherit',
        zIndex: 10,
      }}
    >
      <LockIcon size={24} />
      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{headline}</p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, maxWidth: 220 }}>{subtext}</p>
      <button
        onClick={onUpgrade}
        style={{
          marginTop: 4,
          padding: '8px 18px',
          background: '#0A66C2',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Upgrade to Pro — $49/year
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
  onUpgrade,
}: {
  isPro: boolean
  portfolioId: string
  userId: string
  onUpgrade: () => void
}) {
  const [data, setData] = useState<CareerScoreData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isPro) return
    setLoading(true)
    fetch(`/api/score?portfolioId=${portfolioId}&userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.score !== undefined) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isPro, portfolioId, userId])

  // Circular ring metrics
  const RADIUS = 36
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const displayScore = isPro ? (data?.score ?? 0) : 72 // PLACEHOLDER for Basic
  const strokeDashoffset = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE

  return (
    <div
      className="sm:col-span-3 bg-white border border-gray-100 rounded-2xl p-5"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">AI career score</h3>
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
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Portfolio strength</span>
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
  { event_type: 'portfolio_view', label: null, company: 'Andela', country: 'Nigeria', time: '2h ago' },
  { event_type: 'portfolio_view', label: null, company: 'Flutterwave', country: 'Ghana', time: '5h ago' },
  { event_type: 'link_click', label: 'GitHub', company: null, country: null, time: '1d ago' },
]

interface ActivityEvent {
  event_type: string
  label: string | null
  company: string | null
  country: string | null
  time: string
}

interface AnalyticsSummary {
  viewsByDay: number[]
  topSources: { label: string; pct: number }[]
  recentActivity: ActivityEvent[]
  eventCount: number
}

function AnalyticsSection({
  isPro,
  portfolioId,
  userId,
  onUpgrade,
}: {
  isPro: boolean
  portfolioId: string
  userId: string
  onUpgrade: () => void
}) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    if (!isPro) return
    fetch(`/api/analytics/summary?portfolioId=${portfolioId}&userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => {})
  }, [isPro, portfolioId, userId])

  const bars = isPro && summary ? summary.viewsByDay : PLACEHOLDER_BARS
  const maxBar = Math.max(...bars, 1)
  const sources = isPro && summary ? summary.topSources : PLACEHOLDER_SOURCES
  const activity = isPro && summary ? summary.recentActivity : PLACEHOLDER_ACTIVITY

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="sm:col-span-3 bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Portfolio analytics</h3>
        {isPro && (
          <span className="text-xs bg-[#E8F0F9] text-[#0A66C2] px-2.5 py-1 rounded-full font-medium">
            Last 30 days
          </span>
        )}
      </div>

      {/* Content area — blurred for Basic */}
      <div style={{ position: 'relative' }}>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Left — Views over time bar chart */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Link clicks over time</p>
            <div className="flex items-end gap-1.5 h-24">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.round((h / maxBar) * 100)}%`,
                    minHeight: h > 0 ? 4 : 0,
                    background: isPro ? '#0A66C2' : `rgba(10, 102, 194, 0.7)`,
                    transition: 'height 0.5s ease',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="flex-1 text-center text-[10px] text-gray-300">{d}</span>
              ))}
            </div>
          </div>

          {/* Right — Top sources */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Top sources</p>
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

        {/* Recent activity */}
        <div className="px-5 pb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Recent activity</p>
          <div className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-xs text-gray-400">No activity yet. Share your portfolio to start tracking.</p>
            ) : (
              activity.map((a, i) => {
                const displayTime = typeof a.time === 'string' && a.time.includes('ago')
                  ? a.time
                  : timeAgo(a.time)

                let headline = ''
                let subline = ''
                let avatar = ''

                if (a.event_type === 'portfolio_view') {
                  if (a.company) {
                    headline = `Someone from ${a.company}`
                    subline = a.country ?? 'Unknown location'
                    avatar = a.company[0].toUpperCase()
                  } else {
                    headline = 'Portfolio visit'
                    subline = a.country ?? 'Unknown location'
                    avatar = 'V'
                  }
                } else if (a.event_type === 'github' || (a.event_type === 'link_click' && a.label?.toLowerCase().includes('github'))) {
                  headline = 'GitHub link clicked'
                  subline = 'link click'
                  avatar = 'G'
                } else if (a.event_type === 'linkedin' || (a.event_type === 'link_click' && a.label?.toLowerCase().includes('linkedin'))) {
                  headline = 'LinkedIn link clicked'
                  subline = 'link click'
                  avatar = 'L'
                } else if (a.event_type === 'email') {
                  headline = 'Email link clicked'
                  subline = 'link click'
                  avatar = 'E'
                } else if (a.event_type === 'project_url') {
                  headline = a.label ? `${a.label} project opened` : 'Project link clicked'
                  subline = 'project click'
                  avatar = (a.label?.[0] ?? 'P').toUpperCase()
                } else {
                  headline = a.label ?? a.event_type.replace(/_/g, ' ')
                  subline = a.event_type.replace(/_/g, ' ')
                  avatar = (a.label?.[0] ?? a.event_type[0]).toUpperCase()
                }

                return (
                  <div key={i} className="flex items-center justify-between py-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#E8F0F9] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#0A66C2]">{avatar}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{headline}</p>
                        <p className="text-[10px] text-gray-400">{subline}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-300">{displayTime}</span>
                  </div>
                )
              })
            )}
          </div>
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
  const [template, setTemplate] = useState<'minimal' | 'bold' | 'creative'>('minimal')
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

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/create'); return }

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
    const planRes = await fetch(`/api/user-plan?userId=${session.user.id}`)
    const { plan } = await planRes.json()
    setUserPlan(plan as 'free' | 'basic' | 'pro')

    const { data: portfolioData } = await sb
      .from('portfolios')
      .select('id, template, content, health_score, view_count, last_viewed_at, updated_at')
      .eq('user_id', session.user.id)
      .single()

    if (!portfolioData) { router.push('/create'); return }
    setPortfolio(portfolioData as Portfolio)
    setTemplate((portfolioData.template as 'minimal' | 'bold' | 'creative') || 'minimal')
    setEditContent(portfolioData.content as PortfolioContent)
    setLoading(false)
  }, [router])

  const handleSave = async () => {
    if (!portfolio) return
    setSaving(true)
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
    }
    setSaving(false)
  }

  const copyLink = () => {
    if (!user) return
    navigator.clipboard.writeText(`${APP_URL}/${user.slug}`)
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

  if (!user || !portfolio) return null

  const portfolioUrl = `${APP_URL}/${user.slug}`
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

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* Portfolio URL header */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">
                {isPublished ? 'Your portfolio is live at' : 'Publish to go live at'}
              </p>
              <div className="flex items-center gap-2">
                {isPublished ? (
                  <a
                    href={portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-[#0A66C2] hover:underline"
                  >
                    {new URL(portfolioUrl).host.replace(/^www\./, '')}/{user.slug}
                  </a>
                ) : (
                  <span className="text-lg font-semibold text-gray-400">
                    {new URL(portfolioUrl).host.replace(/^www\./, '')}/{user.slug}
                  </span>
                )}
                {isPublished && (
                  <button
                    onClick={copyLink}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 border border-gray-100 rounded"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Plan badge — clean text pill, no dot */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: planBadge.bg, color: planBadge.text }}
              >
                {planBadge.label}
              </span>
              {isPublished ? (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:border-gray-300 transition-colors"
                >
                  View live →
                </a>
              ) : (
                <a
                  href={`/preview/${portfolio.id}`}
                  className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
                >
                  Publish portfolio →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs — active: blue underline + blue text */}
        <div className="flex mb-6 bg-white border border-gray-100 rounded-xl overflow-hidden w-fit">
          {(['overview', 'edit', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-sm font-medium capitalize transition-all"
              style={{
                color: activeTab === tab ? '#0A66C2' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #0A66C2' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Portfolio strength */}
            <div className="sm:col-span-1">
              <HealthScore score={portfolio.health_score} />
            </div>

            {/* Total views — real count shown to all; blurred for Basic */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5" style={{ position: 'relative', overflow: 'hidden' }}>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total views</span>
              <p className="text-3xl font-bold text-gray-900 mt-1">{portfolio.view_count}</p>
              {portfolio.last_viewed_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Last viewed {new Date(portfolio.last_viewed_at).toLocaleDateString()}
                </p>
              )}
              {/* Blur overlay for Basic users */}
              {!isPro && isPublished && (
                <ProBlurOverlay
                  headline="See your total views"
                  subtext="Upgrade to Pro to track views"
                  onUpgrade={() => setShowUpgradeModal(true)}
                />
              )}
            </div>

            {/* Plan card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Plan</span>
              <p className="text-lg font-bold mt-1" style={{ color: planBadge.text }}>{planBadge.label}</p>
              {user.published_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Published {new Date(user.published_at).toLocaleDateString()}
                </p>
              )}
              {!isPublished && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="mt-3 text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
                >
                  Publish portfolio →
                </button>
              )}
            </div>

            {/* Share — available to all published users */}
            {isPublished && (
              <div className="sm:col-span-3 bg-white border-2 border-[#0A66C2]/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Share your portfolio</h3>
                <p className="text-xs text-gray-400 mb-5">Add your link to every job application, LinkedIn bio, and email signature.</p>

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
                            const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=2&format=png`
                            const res = await fetch(url)
                            const blob = await res.blob()
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `${user.slug}-portfolio-qr.png`
                            a.click()
                          }}
                          className="text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
                        >
                          Download QR →
                        </button>
                      </>
                    ) : (
                      /* PLACEHOLDER — shown to Basic users only: blurred real QR for upgrade URL */
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
                            gap: 6,
                            borderRadius: 12,
                          }}
                        >
                          <LockIcon size={18} />
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            style={{ fontSize: 11, fontWeight: 600, color: '#0A66C2', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            QR — Pro only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Share buttons */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-3">
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
                        className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                      >
                        LinkedIn
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my professional portfolio at ${portfolioUrl} — built with liveportfolio.site`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                      >
                        X / Twitter
                      </a>
                      <a
                        href={`mailto:?subject=My professional portfolio&body=Hi, check out my portfolio: ${portfolioUrl}`}
                        className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
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
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            )}

            {/* Analytics — blurred preview for Basic, full data for Pro */}
            {isPublished && (
              <AnalyticsSection
                isPro={isPro}
                portfolioId={portfolio.id}
                userId={user.id}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            )}

            {/* Unpublished CTA */}
            {!isPublished && (
              <div className="sm:col-span-3 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-2xl p-5 text-center">
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>

            {/* Template switcher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <div className="flex gap-2">
                {(['minimal', 'bold', 'creative'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`px-4 py-2 text-sm rounded-full border capitalize transition-all ${
                      template === t
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About / Bio</label>
                <textarea
                  value={editContent.about || ''}
                  onChange={(e) => setEditContent((prev) => ({ ...prev, about: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="space-y-5">

            {/* Account info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <p className="text-sm text-gray-700">{user.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Portfolio URL</label>
                <p className="text-sm text-[#0A66C2] font-medium">{APP_URL}/{user.slug}</p>
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
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
                  className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
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
  )
}
