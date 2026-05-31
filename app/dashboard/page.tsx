'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import type { PortfolioContent } from '@/components/templates/Minimal'
import Logo from '@/components/Logo'

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

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? '#0A66C2' : score >= 60 ? '#f59e0b' : '#ef4444'
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
  const [template, setTemplate] = useState<'minimal' | 'bold' | 'creative'>('minimal')
  const [editContent, setEditContent] = useState<Partial<PortfolioContent>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'settings'>('overview')
  const [copied, setCopied] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')
  const [qrDownloading, setQrDownloading] = useState(false)

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

  const downloadQr = async () => {
    if (!user) return
    setQrDownloading(true)
    const portfolioUrl = `${APP_URL}/${user.slug}`
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=2&format=png`
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${user.slug}-portfolio-qr.png`
    a.click()
    setQrDownloading(false)
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
    // Re-authenticate first to verify current password
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
    if (deleteConfirm !== user?.slug) {
      setDeleteMsg('Type your username exactly to confirm.')
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
  const isPublished = user.plan !== 'unpublished'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/"><Logo /></a>
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
              {isPublished ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-[#0A66C2] bg-[#E8F0F9] px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#0A66C2] rounded-full" />
                    Pro
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
                  className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
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
            </div>

            {/* Share your portfolio */}
            {isPublished && (
              <div className="sm:col-span-3 bg-white border-2 border-[#0A66C2]/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Share your portfolio</h3>
                <p className="text-xs text-gray-400 mb-5">Add your link to every job application, LinkedIn bio, and email signature.</p>

                <div className="flex flex-col sm:flex-row gap-5">
                  {/* QR code */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=1`}
                      alt="Portfolio QR code"
                      width={140}
                      height={140}
                      className="rounded-xl border border-gray-100"
                    />
                    <button
                      onClick={downloadQr}
                      disabled={qrDownloading}
                      className="text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors disabled:opacity-50"
                    >
                      {qrDownloading ? 'Downloading…' : 'Download QR →'}
                    </button>
                  </div>

                  {/* Share buttons */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-3">Print your QR code and add it to your CV, business card, or email signature.</p>
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
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my professional portfolio at ${portfolioUrl} — built with liveportfolio.site 🚀`)}`}
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

            {!isPublished && (
              <div className="sm:col-span-3 bg-white border border-gray-100 rounded-2xl p-5 text-center">
                <p className="text-sm text-gray-500 mb-3">Publish your portfolio to get a shareable link.</p>
                <a
                  href={`/preview/${portfolio.id}`}
                  className="inline-block px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
                >
                  Publish now — $5
                </a>
              </div>
            )}
          </div>
        )}

        {/* Edit tab */}
        {activeTab === 'edit' && user.plan !== 'pro' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">✏️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Publish to unlock editing</h2>
              <p className="text-sm text-gray-500 mb-6">
                Go Pro for $5 to publish your portfolio and edit your bio, projects, and links anytime — changes go live instantly.
              </p>
              <a
                href={`/preview/${portfolio.id}`}
                className="inline-block px-6 py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
              >
                Publish my portfolio — $5
              </a>
            </div>
          </div>
        )}

        {activeTab === 'edit' && user.plan === 'pro' && (
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

        {/* Settings tab */}
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
                <p className="text-sm text-gray-700 capitalize">{user.plan === 'pro' ? '✓ Pro — published' : 'Unpublished'}</p>
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
                <p className="text-xs text-gray-500">Type <strong className="text-gray-700 font-mono">{user.slug}</strong> to confirm:</p>
                <input
                  type="text"
                  placeholder={user.slug}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirm !== user.slug}
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
