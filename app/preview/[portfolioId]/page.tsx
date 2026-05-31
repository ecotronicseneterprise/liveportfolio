'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import Neutral from '@/components/templates/Neutral'
import type { PortfolioContent } from '@/components/templates/Minimal'
import Logo from '@/components/Logo'

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

const CONFETTI = [
  { left: '5%', delay: '0s', dur: '2.5s', color: '#0A66C2', size: 8 },
  { left: '10%', delay: '0.3s', dur: '3s', color: '#F59E0B', size: 10 },
  { left: '18%', delay: '0.1s', dur: '2.2s', color: '#58A6FF', size: 9 },
  { left: '25%', delay: '0.5s', dur: '2.8s', color: '#EF4444', size: 7 },
  { left: '30%', delay: '0.2s', dur: '3.2s', color: '#8B5CF6', size: 11 },
  { left: '38%', delay: '0.7s', dur: '2.4s', color: '#0A66C2', size: 8 },
  { left: '45%', delay: '0s', dur: '2.9s', color: '#F59E0B', size: 10 },
  { left: '52%', delay: '0.4s', dur: '2.6s', color: '#0A66C2', size: 9 },
  { left: '58%', delay: '0.6s', dur: '3.1s', color: '#58A6FF', size: 12 },
  { left: '65%', delay: '0.1s', dur: '2.3s', color: '#EF4444', size: 8 },
  { left: '70%', delay: '0.8s', dur: '2.7s', color: '#8B5CF6', size: 10 },
  { left: '75%', delay: '0.3s', dur: '3.3s', color: '#0A66C2', size: 9 },
  { left: '80%', delay: '0.5s', dur: '2.1s', color: '#0A66C2', size: 11 },
  { left: '85%', delay: '0.2s', dur: '2.8s', color: '#F59E0B', size: 8 },
  { left: '90%', delay: '0.6s', dur: '3s', color: '#58A6FF', size: 7 },
  { left: '95%', delay: '0.1s', dur: '2.5s', color: '#EF4444', size: 9 },
  { left: '15%', delay: '0.9s', dur: '2.4s', color: '#8B5CF6', size: 10 },
  { left: '42%', delay: '0.7s', dur: '3.2s', color: '#0A66C2', size: 8 },
  { left: '62%', delay: '0.4s', dur: '2.6s', color: '#F59E0B', size: 11 },
  { left: '88%', delay: '0.3s', dur: '2.9s', color: '#0A66C2', size: 9 },
]

function CelebrationOverlay({
  slug,
  onDismiss,
  onDashboard,
}: {
  slug: string
  onDismiss: () => void
  onDashboard: () => void
}) {
  const [copied, setCopied] = useState(false)
  const portfolioUrl = `${APP_URL}/${slug}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=1`

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const copyUrl = () => {
    navigator.clipboard.writeText(portfolioUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQr = async () => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(portfolioUrl)}&color=0A66C2&bgcolor=ffffff&qzone=2&format=png`
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slug}-portfolio-qr.png`
    a.click()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {CONFETTI.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: c.left,
            top: '-10px',
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            borderRadius: '2px',
            animation: `confetti-fall ${c.dur} ${c.delay} ease-in forwards`,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div className="absolute inset-0 bg-black/60" onClick={onDismiss} />

      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>

        <div className="text-4xl mb-3 text-center">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Your portfolio is live.</h2>
        <p className="text-gray-500 text-sm mb-5 text-center">Share it and start getting noticed.</p>

        {/* URL copy */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-4">
          <span className="flex-1 text-sm font-mono text-gray-700 truncate">{portfolioUrl}</span>
          <button
            onClick={copyUrl}
            className="text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] flex-shrink-0 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* QR code */}
        <div className="flex items-center gap-4 bg-[#E8F0F9] rounded-2xl p-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Portfolio QR code" width={80} height={80} className="rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 mb-0.5">Your QR code</p>
            <p className="text-xs text-gray-500 mb-2">Print it, add it to your CV, or put it in your email signature.</p>
            <button
              onClick={downloadQr}
              className="text-xs font-semibold text-[#0A66C2] hover:text-[#084D9A] transition-colors"
            >
              Download PNG →
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out my professional portfolio: ${portfolioUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="py-2 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors text-center"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="py-2 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors text-center"
          >
            LinkedIn
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just launched my professional portfolio at ${portfolioUrl} — built with @liveportfolio in under 5 minutes 🚀`)}`}
            target="_blank" rel="noopener noreferrer"
            className="py-2 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors text-center"
          >
            X / Twitter
          </a>
          <a
            href={`mailto:?subject=My professional portfolio&body=Hi, check out my portfolio: ${portfolioUrl}`}
            className="py-2 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors text-center"
          >
            Email
          </a>
        </div>

        <div className="flex gap-2">
          <a
            href={portfolioUrl}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 border-2 border-[#0A66C2] text-[#0A66C2] text-sm font-semibold rounded-full hover:bg-[#E8F0F9] transition-colors text-center"
          >
            View portfolio →
          </a>
          <button
            onClick={onDashboard}
            className="flex-1 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

interface HealthItem {
  label: string
  points: number
  earned: boolean
  hint: string
}

function calculateHealth(content: PortfolioContent): { score: number; items: HealthItem[] } {
  const items: HealthItem[] = [
    {
      label: 'Profile photo',
      points: 10,
      earned: !!content.avatar_url,
      hint: 'Add a profile photo in Step 1',
    },
    {
      label: 'GitHub profile',
      points: 10,
      earned: !!content.github_url,
      hint: 'Add your GitHub URL in Step 1',
    },
    {
      label: 'LinkedIn profile',
      points: 10,
      earned: !!content.linkedin_url,
      hint: 'Add your LinkedIn URL in Step 1',
    },
    {
      label: '3 or more projects',
      points: 20,
      earned: content.projects?.length >= 3,
      hint: 'Add more projects in Step 2 (currently have ' + (content.projects?.length || 0) + ')',
    },
    {
      label: 'Project outcomes with metrics',
      points: 15,
      earned: (content.projects || []).some((p) => /\d/.test(p.outcome || '')),
      hint: 'Include numbers in your project descriptions (e.g. "reduced load time by 40%")',
    },
    {
      label: 'Detailed bio (100+ words)',
      points: 10,
      earned: (content.about || '').split(' ').length > 100,
      hint: 'Expand your bio in Step 1 for AI to write more',
    },
    {
      label: '5 or more skills',
      points: 10,
      earned: (content.skills || []).length >= 5,
      hint: 'Add more tech skills via project stack fields',
    },
    {
      label: 'Work experience',
      points: 15,
      earned: (content.experience || []).length > 0,
      hint: 'Experience section helps recruiters trust you',
    },
  ]

  const score = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0)
  return { score, items }
}

export default function PreviewPage() {
  const { portfolioId } = useParams() as { portfolioId: string }
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

  const [content, setContent] = useState<PortfolioContent | null>(null)
  const [template, setTemplate] = useState<'minimal' | 'bold' | 'neutral'>('minimal')
  const [portfolioUserId, setPortfolioUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [deferEmail, setDeferEmail] = useState('')
  const [showDeferForm, setShowDeferForm] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [justPaid, setJustPaid] = useState(false)
  const [slug, setSlug] = useState('')
  const [paying, setPaying] = useState(false)
  const [ngnRate, setNgnRate] = useState(1500)

  // Fetch live USD → NGN rate; fall back to 1500 if API is unreachable
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.NGN
        if (typeof rate === 'number' && rate > 100) setNgnRate(Math.round(rate))
      })
      .catch(() => {})
  }, [])

  // Load Paystack inline script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    loadPortfolio()
  }, [portfolioId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolio = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: portfolio, error } = await sb
      .from('portfolios')
      .select('id, template, content, user_id')
      .eq('id', portfolioId)
      .single()

    if (error || !portfolio) {
      router.push('/create')
      return
    }

    setContent(portfolio.content as PortfolioContent)
    setTemplate((portfolio.template as 'minimal' | 'bold' | 'neutral') || 'minimal')
    setPortfolioUserId(portfolio.user_id)

    // Check if paid + get email for Paystack
    const { data: user } = await sb
      .from('users')
      .select('plan, slug, email')
      .eq('id', portfolio.user_id)
      .single()

    if (user) {
      setIsPaid(user.plan !== 'unpublished')
      setSlug(user.slug || '')
      setUserEmail((user as { email?: string }).email || '')
    }

    setLoading(false)
  }, [portfolioId, router])

  // Listen for real-time payment updates
  useEffect(() => {
    if (!portfolioUserId) return
    const channel = supabase
      .channel(`user-plan-${portfolioUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${portfolioUserId}`,
      }, (payload) => {
        const newPlan = (payload.new as { plan: string }).plan
        if (newPlan !== 'unpublished') {
          setIsPaid(true)
          setPaying(false)
          setJustPaid(true)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [portfolioUserId])

  const switchTemplate = async (t: 'minimal' | 'bold' | 'neutral') => {
    setTemplate(t)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch('/api/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ template: t }),
      })
    }
  }

  const handlePaystack = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PaystackPop = (window as any).PaystackPop
    if (!PaystackPop) {
      alert('Payment is loading — please try again in a moment.')
      return
    }

    const amountKobo = Math.round(5 * ngnRate * 100) // $5 in NGN kobo
    const reference = `lp-${portfolioId}-pro-${Date.now()}`

    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountKobo,
      currency: 'NGN',
      ref: reference,
      metadata: {
        user_id: portfolioUserId,
        plan: 'pro',
        portfolio_id: portfolioId,
      },
      callback: () => {
        // Webhook updates the plan; Realtime notifies this page
        setPaying(true)
      },
      onClose: () => {},
    })
    handler.openIframe()
  }

  const handleSaveEmail = async () => {
    if (!deferEmail.includes('@')) return
    setSavingEmail(true)
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: deferEmail,
        user_id: portfolioUserId,
        source: 'preview_defer',
        preview_url: `https://liveportfolio.site/preview/${portfolioId}`,
      }),
    })
    setSavingEmail(false)
    setEmailSaved(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!content) return null

  // Payment processing state — waiting for webhook → Realtime
  if (paying) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Activating your portfolio…</h2>
          <p className="text-sm text-gray-500">Payment received. Your portfolio will go live in a few seconds.</p>
        </div>
      </div>
    )
  }

  const { score, items } = calculateHealth(content)
  const missing = items.filter((i) => !i.earned)
  const Template = template === 'bold' ? Bold : template === 'neutral' ? Neutral : Minimal

  return (
    <div className="relative">
      {justPaid && (
        <CelebrationOverlay
          slug={slug}
          onDismiss={() => setJustPaid(false)}
          onDashboard={() => router.push('/dashboard')}
        />
      )}

      {/* Preview header bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href="/"><Logo /></a>
            <span className="text-sm font-semibold text-gray-500">Preview</span>
            {/* Template switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              {(['minimal', 'bold', 'neutral'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTemplate(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all capitalize ${
                    template === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isPaid ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#0A66C2] font-medium">✓ Live at</span>
              <a
                href={`${APP_URL}/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0A66C2] hover:underline font-medium"
              >
                {new URL(APP_URL).host.replace(/^www\./, '')}/{slug} →
              </a>
            </div>
          ) : (
            <button
              onClick={handlePaystack}
              className="px-4 py-2 bg-[#0A66C2] text-white text-xs font-bold rounded-full hover:bg-[#084D9A] transition-colors whitespace-nowrap"
            >
              Publish my portfolio — $5
            </button>
          )}
        </div>
      </div>

      {/* Health score panel */}
      {!isPaid && (
        <div className="bg-gradient-to-r from-[#E8F0F9] to-white border-b border-[#0A66C2]/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Portfolio strength:</span>
                <span className="text-lg font-bold text-[#0A66C2]">{score}/100</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A66C2] rounded-full transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            {missing.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {missing.map((item) => (
                  <div
                    key={item.label}
                    title={item.hint}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-100 rounded-full text-xs text-gray-500 hover:border-[#0A66C2] hover:text-[#0A66C2] cursor-pointer transition-colors"
                    onClick={() => router.push('/create')}
                  >
                    <span className="text-gray-300">+{item.points}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watermark (non-paid only) */}
      {!isPaid && (
        <div className="fixed bottom-20 right-4 z-40 sm:bottom-8 sm:right-6">
          <div className="bg-[#0A0A0A] text-white text-xs px-3 py-1.5 rounded-full shadow-lg opacity-80">
            Unlock to publish
          </div>
        </div>
      )}

      {/* Portfolio render */}
      <Template content={content} />

      {/* Mobile CTA (non-paid only) */}
      {!isPaid && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 sm:hidden">
          <button
            onClick={handlePaystack}
            className="w-full py-3 bg-[#0A66C2] text-white text-sm font-bold rounded-full"
          >
            Publish my portfolio — $5
          </button>
        </div>
      )}

      {/* Save progress / defer */}
      {!isPaid && !emailSaved && (
        <div className="bg-gray-50 border-t border-gray-100 py-8 px-4 text-center">
          {showDeferForm ? (
            <div className="max-w-sm mx-auto">
              <p className="text-sm font-medium text-gray-700 mb-3">We'll email you a link to come back</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={deferEmail}
                  onChange={(e) => setDeferEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail}
                  className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {savingEmail ? '…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeferForm(true)}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Save my progress — I'll come back later
            </button>
          )}
        </div>
      )}

      {emailSaved && (
        <div className="bg-[#E8F0F9] border-t border-[#0A66C2]/20 py-6 px-4 text-center">
          <p className="text-sm text-[#0A66C2] font-medium">✓ Portfolio saved. Check your email.</p>
        </div>
      )}
    </div>
  )
}
