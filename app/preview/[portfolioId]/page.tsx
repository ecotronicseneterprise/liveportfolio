'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import type { PortfolioContent } from '@/components/templates/Minimal'

const LAUNCH_URL = 'https://app.lemonsqueezy.com/checkout/buy/LAUNCH_PRODUCT_ID'
const PRO_URL = 'https://app.lemonsqueezy.com/checkout/buy/PRO_PRODUCT_ID'

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

  const [content, setContent] = useState<PortfolioContent | null>(null)
  const [template, setTemplate] = useState<'minimal' | 'bold'>('minimal')
  const [portfolioUserId, setPortfolioUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [deferEmail, setDeferEmail] = useState('')
  const [showDeferForm, setShowDeferForm] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [slug, setSlug] = useState('')

  useEffect(() => {
    loadPortfolio()
  }, [portfolioId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolio = useCallback(async () => {
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select('id, template, content, user_id')
      .eq('id', portfolioId)
      .single()

    if (error || !portfolio) {
      router.push('/create')
      return
    }

    setContent(portfolio.content as PortfolioContent)
    setTemplate((portfolio.template as 'minimal' | 'bold') || 'minimal')
    setPortfolioUserId(portfolio.user_id)

    // Check if paid
    const { data: user } = await supabase
      .from('users')
      .select('plan, slug')
      .eq('id', portfolio.user_id)
      .single()

    if (user) {
      setIsPaid(user.plan !== 'unpublished')
      setSlug(user.slug || '')
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
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [portfolioUserId])

  const switchTemplate = async (t: 'minimal' | 'bold') => {
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
      }),
    })
    setSavingEmail(false)
    setEmailSaved(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!content) return null

  const { score, items } = calculateHealth(content)
  const missing = items.filter((i) => !i.earned)
  const Template = template === 'bold' ? Bold : Minimal

  return (
    <div className="relative">
      {/* Preview header bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-900">Preview</span>
            {/* Template switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              {(['minimal', 'bold'] as const).map((t) => (
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
              <span className="text-xs text-[#1D9E75] font-medium">✓ Live at</span>
              <a
                href={`https://${slug}.liveportfolio.site`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1D9E75] hover:underline font-medium"
              >
                {slug}.liveportfolio.site →
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(PRO_URL, '_blank')}
                className="px-4 py-2 bg-[#1D9E75] text-white text-xs font-bold rounded-full hover:bg-[#178a64] transition-colors whitespace-nowrap"
              >
                Publish — $19 Professional
              </button>
              <button
                onClick={() => window.open(LAUNCH_URL, '_blank')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-full hover:border-gray-300 transition-colors whitespace-nowrap"
              >
                $9 Launch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Health score panel */}
      {!isPaid && (
        <div className="bg-gradient-to-r from-[#f0fdf8] to-white border-b border-[#1D9E75]/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Portfolio strength:</span>
                <span className="text-lg font-bold text-[#1D9E75]">{score}/100</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D9E75] rounded-full transition-all duration-700"
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
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-100 rounded-full text-xs text-gray-500 hover:border-[#1D9E75] hover:text-[#1D9E75] cursor-pointer transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 flex gap-2 sm:hidden">
          <button
            onClick={() => window.open(PRO_URL, '_blank')}
            className="flex-1 py-3 bg-[#1D9E75] text-white text-sm font-bold rounded-full"
          >
            Publish — $19
          </button>
          <button
            onClick={() => window.open(LAUNCH_URL, '_blank')}
            className="px-4 py-3 border border-gray-200 text-gray-600 text-sm rounded-full"
          >
            $9
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
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
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
        <div className="bg-[#f0fdf8] border-t border-[#1D9E75]/20 py-6 px-4 text-center">
          <p className="text-sm text-[#1D9E75] font-medium">✓ Portfolio saved. Check your email.</p>
        </div>
      )}
    </div>
  )
}
