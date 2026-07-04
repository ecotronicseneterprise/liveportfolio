import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import SupportButton from '@/components/SupportButton'

export const metadata: Metadata = {
  title: 'AI Portfolio Builder — From CV to Live Website in Minutes | LivePortfolio',
  description: 'The portfolio builder for people who don\'t have hours to build a portfolio. Upload your CV, let AI do the writing, publish a professional website in minutes.',
  alternates: { canonical: 'https://liveportfolio.site/portfolio-builder' },
  openGraph: {
    title: 'AI Portfolio Builder | LivePortfolio',
    description: 'Upload your CV, let AI do the writing, publish in minutes. No design skills needed.',
    url: 'https://liveportfolio.site/portfolio-builder',
    type: 'website',
  },
}

const FAQ_ITEMS = [
  {
    q: 'What\'s the difference between LivePortfolio and Wix or Squarespace?',
    a: 'Wix and Squarespace are general website builders — powerful, but they assume you\'re starting from nothing and have hours to design. LivePortfolio is purpose-built for career portfolios: you start from your CV, the AI writes the copy, and the templates are already optimized for what recruiters actually look for.',
  },
  {
    q: 'Can I customize the design after the AI generates it?',
    a: 'Yes — you can edit any AI-written section, swap templates, and adjust details. The AI gives you a strong first draft; you stay in control of the final version.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. Zero coding, zero design software, zero drag-and-drop learning curve.',
  },
]

export default function PortfolioBuilderPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
            <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
            AI-powered — no design skills needed
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">
            The Portfolio Builder for People Who Don&apos;t Have Time to Build a Portfolio
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-2xl">
            Most portfolio builders hand you a blank canvas and call it flexibility. LivePortfolio hands you a finished portfolio, built from your CV, in the time it takes to make a cup of tea.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20 self-start"
            >
              Build My Portfolio →
            </Link>
            <span className="text-sm text-gray-400">Free to build and preview. No credit card needed.</span>
          </div>
        </div>
      </section>

      {/* ── Why flexible builders don't work ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Why "flexible" portfolio builders don't actually work</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            Drag-and-drop portfolio builders promise total creative control. In practice, that means hours spent moving boxes around instead of applying for jobs. LivePortfolio takes the opposite approach: we start from what you already have — your CV — and do the writing and the design for you. You edit from a finished starting point, not an empty one.
          </p>
        </div>
      </section>

      {/* ── What makes it AI ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What makes it an AI portfolio builder, specifically</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            The "AI" isn't a gimmick — it's the part that actually saves you time. You upload your CV. The AI reads your experience, understands what's worth highlighting, and writes portfolio copy that sounds professional and specific, not generic. You're not filling in a Mad Libs template. You're getting a first draft good enough to publish.
          </p>
        </div>
      </section>

      {/* ── Built for the way people job hunt ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-8">Built for the way people actually job hunt now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            {[
              'Speed — a finished, previewable portfolio in minutes, not a weekend project',
              'Visitor analytics — know when someone from a new country opens your portfolio',
              'Mobile-first templates — because most of your traffic will come from someone clicking a link on their phone',
              'A real URL — not a PDF, not a Notion doc pretending to be a website',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-5 border border-gray-100 rounded-2xl bg-white">
                <span className="text-[#0A66C2] font-bold flex-shrink-0 mt-0.5">✓</span>
                <span className="text-base text-gray-700 leading-[1.6]">{item}</span>
              </div>
            ))}
          </div>
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
            Stop building. Start applying.
          </h2>
          <p className="text-lg sm:text-xl font-medium text-gray-600 mb-8">
            Your portfolio can be ready before your next coffee goes cold.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Build My Portfolio →
          </Link>
          <p className="text-sm text-gray-400 mt-4">Free to build and preview. No credit card needed.</p>
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
