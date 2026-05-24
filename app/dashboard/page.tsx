'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import type { PortfolioContent } from '@/components/templates/Minimal'

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

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Portfolio strength</span>
        <span className="text-xl font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
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
  const [template, setTemplate] = useState<'minimal' | 'bold'>('minimal')
  const [editContent, setEditContent] = useState<Partial<PortfolioContent>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'settings'>('overview')
  const [copied, setCopied] = useState(false)

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

    const { data: portfolioData } = await sb
      .from('portfolios')
      .select('id, template, content, health_score, view_count, last_viewed_at, updated_at')
      .eq('user_id', session.user.id)
      .single()

    if (!portfolioData) { router.push('/create'); return }
    setPortfolio(portfolioData as Portfolio)
    setTemplate((portfolioData.template as 'minimal' | 'bold') || 'minimal')
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
    navigator.clipboard.writeText(`https://${user.slug}.liveportfolio.site`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !portfolio) return null

  const portfolioUrl = `https://${user.slug}.liveportfolio.site`
  const isPublished = user.plan !== 'unpublished'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="text-sm font-semibold text-gray-900">liveportfolio.site</a>
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
                    className="text-lg font-semibold text-[#1D9E75] hover:underline"
                  >
                    {user.slug}.liveportfolio.site
                  </a>
                ) : (
                  <span className="text-lg font-semibold text-gray-400">
                    {user.slug}.liveportfolio.site
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
              {isPublished ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-[#1D9E75] bg-[#f0fdf8] px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full" />
                    {user.plan === 'professional' ? 'Professional' : 'Launch'}
                  </span>
                  <a
                    href={portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:border-gray-300 transition-colors"
                  >
                    View live →
                  </a>
                </>
              ) : (
                <a
                  href={`/preview/${portfolio.id}`}
                  className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-full hover:bg-[#178a64] transition-colors"
                >
                  Publish portfolio →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
          {(['overview', 'edit', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <HealthScore score={portfolio.health_score} />
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total views</span>
              <p className="text-3xl font-bold text-gray-900 mt-1">{portfolio.view_count}</p>
              {portfolio.last_viewed_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Last viewed {new Date(portfolio.last_viewed_at).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Plan</span>
              <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{user.plan}</p>
              {user.published_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Published {new Date(user.published_at).toLocaleDateString()}
                </p>
              )}
              {user.plan !== 'professional' && isPublished && (
                <a
                  href={`/preview/${portfolio.id}`}
                  className="text-xs text-[#1D9E75] hover:underline mt-2 block"
                >
                  Upgrade to edit your portfolio →
                </a>
              )}
            </div>

            {/* Quick actions */}
            <div className="sm:col-span-3 bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('edit')}
                  className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                >
                  Edit portfolio
                </button>
                {isPublished && (
                  <>
                    <button
                      onClick={copyLink}
                      className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                    >
                      {copied ? '✓ Copied link' : 'Copy portfolio link'}
                    </button>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                    >
                      Share on LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit tab */}
        {activeTab === 'edit' && user.plan !== 'professional' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">✏️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Editing is a Professional feature</h2>
              <p className="text-sm text-gray-500 mb-6">
                Upgrade to Professional to edit your bio, projects, and links anytime — your live portfolio updates instantly.
              </p>
              <a
                href={`/preview/${portfolio.id}`}
                className="inline-block px-6 py-3 bg-[#1D9E75] text-white text-sm font-semibold rounded-full hover:bg-[#178a64] transition-colors"
              >
                Upgrade to Professional — $19
              </a>
            </div>
          </div>
        )}

        {activeTab === 'edit' && user.plan === 'professional' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit your portfolio</h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-full hover:bg-[#178a64] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>

            {/* Template switcher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <div className="flex gap-2">
                {(['minimal', 'bold'] as const).map((t) => (
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About / Bio</label>
                <textarea
                  value={editContent.about || ''}
                  onChange={(e) => setEditContent((prev) => ({ ...prev, about: e.target.value }))}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-full hover:bg-[#178a64] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Account settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                  {user.slug}.liveportfolio.site
                </span>
              </div>
            </div>

            {user.plan === 'professional' && (
              <div className="bg-[#f0fdf8] border border-[#1D9E75]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wider mb-1">Professional plan</p>
                <p className="text-sm text-gray-600">You can edit your portfolio anytime from the Edit tab. Changes go live instantly.</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
