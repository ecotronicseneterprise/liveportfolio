import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import SupportButton from '@/components/SupportButton'
import LocalisedPrice from '@/components/LocalisedPrice'

export const metadata: Metadata = {
  title: 'Build a Free Portfolio Website — Publish When You\'re Ready | LivePortfolio',
  description: 'Build and preview your portfolio website completely free. No credit card, no time limit on trying it. Pay only when you\'re ready to publish it live.',
  alternates: { canonical: 'https://liveportfolio.site/free-portfolio-website' },
  openGraph: {
    title: 'Free Portfolio Website Builder | LivePortfolio',
    description: 'Build and preview completely free. Pay only when you\'re ready to publish.',
    url: 'https://liveportfolio.site/free-portfolio-website',
    type: 'website',
  },
}

const FAQ_ITEMS = [
  {
    q: 'Is there a catch to the free plan?',
    a: 'No watermark tricks, no feature-gutted demo. The free tier is the real product for building and previewing. Publishing live is the only thing behind a plan.',
  },
  {
    q: 'What happens to my portfolio if I don\'t pay?',
    a: 'It stays saved and previewable. Nothing is deleted. You can come back and publish whenever you\'re ready.',
  },
  {
    q: 'Can I cancel after publishing?',
    a: 'Yes — plans can be cancelled anytime. See the pricing page for the current refund window.',
  },
]

export default function FreePortfolioWebsitePage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
            <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
            Free to build — pay only when you publish
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">
            Build Your Portfolio Website Free — Publish When You&apos;re Ready
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-2xl">
            No credit card to start. No trial countdown. Build your entire portfolio, see exactly how it looks, and only pay the moment you decide to make it live.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20 self-start"
            >
              Build My Portfolio, Free →
            </Link>
            <span className="text-sm text-gray-400">No credit card needed. No time limit on previewing.</span>
          </div>
        </div>
      </section>

      {/* ── What free actually means ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What "free" actually means here</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            A lot of "free portfolio website" tools give you a free plan that's really a locked demo — watermarked, feature-limited, designed to frustrate you into upgrading. LivePortfolio does it differently: building and previewing your full portfolio is genuinely free, with the real AI writing and the real templates. You only pay when you decide to publish it live and make it shareable with the world.
          </p>
        </div>
      </section>

      {/* ── Why build before you commit ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Why build before you commit</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            You shouldn't have to pay to find out if a tool is any good. Upload your CV, let the AI write your portfolio, try different templates, see the finished product exactly as a recruiter would see it — all before spending anything. If it's not right for you, you've lost nothing but a few minutes.
          </p>
        </div>
      </section>

      {/* ── When you're ready to publish ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">When you're ready to publish</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            Plans start from <LocalisedPrice ngn="₦15,000/year" usd="$10/year" />. That gets you a live, shareable link, hosting that just works, and real-time visitor notifications — know when someone from a new country opens your portfolio. Unlike almost every other portfolio tool, your analytics are included, not an add-on.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">FAQ</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={item.q}
                className={`group bg-white${i % 2 === 0 ? ' lg:border-r border-gray-100' : ''}${i < FAQ_ITEMS.length - 2 ? ' border-b border-gray-100' : ''}`}
              >
                <summary className="flex items-center justify-between px-6 sm:px-8 py-5 cursor-pointer list-none gap-4">
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs flex-shrink-0">▼</span>
                </summary>
                <div className="px-6 sm:px-8 pb-5 text-base text-gray-600 leading-[1.7]">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0A0A0A] leading-tight mb-4">
            Nothing to lose. A portfolio to gain.
          </h2>
          <p className="text-lg sm:text-xl font-medium text-gray-600 mb-8">
            Build yours free. Publish when you're ready.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Build My Portfolio, Free →
          </Link>
          <p className="text-sm text-gray-400 mt-4">No credit card needed. No time limit on previewing.</p>
        </div>
      </section>

      <SupportButton />

      {/* ── Footer ── */}
      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-6">
            <a href="/blog" className="hover:text-gray-600 transition-colors">Blog</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
