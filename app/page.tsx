import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import LocalisedPrice from '@/components/LocalisedPrice'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://liveportfolio.site',
  },
}
import SupportButton from '@/components/SupportButton'
import PricingSection from '@/components/PricingSection'
import PortfolioShowcaseWrapper from '@/components/PortfolioShowcaseWrapper'
import PublishedCount from '@/components/PublishedCount'

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can I preview before paying?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can build and preview your full portfolio for free before deciding to publish. No payment needed to see your results.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does billing work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Plans are billed annually — from $10/year for Basic to $30/year for Pro (₦15,000/year and ₦45,000/year in Nigeria). 7-day refund guarantee, no questions asked. Cancel anytime.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I edit my portfolio after publishing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Log into your dashboard to edit any text, switch templates, or update your projects. Changes go live instantly — no re-generation needed.',
      },
    },
    {
      '@type': 'Question',
      name: 'What do I get when I publish?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Basic gives you a live portfolio at liveportfolio.site/yourname, all three templates, and full editing from your dashboard. Pro adds an analytics dashboard (see who views you and from where), QR code sharing, weekly career score, custom domain, and an export pack.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is this for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Developers, designers, data scientists, product managers, freelancers — anyone who wants a professional online presence and wants to know when someone views their profile and from where.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need design or coding skills?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'None at all. Add your experience, pick a template, and publish. We handle the writing.',
      },
    },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LivePortfolio',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://liveportfolio.site',
  description: 'Upload your CV and we turn it into a professional portfolio website. Build your online presence and know when someone views your profile.',
  audience: {
    '@type': 'Audience',
    audienceType: 'Developers, designers, data scientists, product managers, freelancers, career switchers',
  },
}


const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Can I preview before paying?',
    a: 'Yes. You can build and preview your full portfolio for free before deciding to publish. No payment needed to see your results.',
  },
  {
    q: 'How does billing work?',
    a: <>Plans are billed annually — <LocalisedPrice ngn="₦15,000/year for Basic, ₦45,000/year for Pro" usd="$10/year for Basic, $30/year for Pro" /> . 7-day refund guarantee, no questions asked. Cancel anytime.</>,
  },
  {
    q: 'Can I edit my portfolio after publishing?',
    a: 'Yes. Log into your dashboard to edit any text, switch templates, or update your projects. Changes go live instantly — no re-generation needed.',
  },
  {
    q: 'What do I get when I publish?',
    a: 'Basic gives you a live portfolio at liveportfolio.site/yourname, all three templates, and full editing from your dashboard. Pro adds an analytics dashboard (see who views you and from where), QR code sharing, weekly career score, custom domain, and an export pack (PDF, LinkedIn summary, cover letter).',
  },
  {
    q: 'Who is this for?',
    a: 'Developers, designers, data scientists, product managers, freelancers — anyone who wants a professional online presence and wants to know when someone views their profile and from where.',
  },
  {
    q: 'Do I need design or coding skills?',
    a: 'None at all. Add your experience, pick a template, and publish. We handle the writing.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Nav ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">

        {/* Headline + CTA — full width, large padding */}
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
              <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
              For developers, designers, data scientists, graduates and freelancers — anywhere in the world.
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05]">
              Turn Your CV Into a Portfolio in Minutes — No Design Skills Needed
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mt-4">
              LivePortfolio turns your CV into a portfolio website. We tell your story, you publish it. Free to build and preview — no credit card needed.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
              Not hearing back after sending out multiple job applications hurts. It makes you question everything you've built. A portfolio won't fix the silence, but it makes sure they can't ignore what you've done.
            </p>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
              Upload your CV and we tell your story. Get a professional portfolio website that builds your online presence — and see when someone views it, and where they're from.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/create"
                className="px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20"
              >
                Build My Portfolio →
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Free to build and preview. No credit card needed.</span>
              <PublishedCount />
            </div>
          </div>
        </div>

        <PortfolioShowcaseWrapper />

      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                step: '01',
                title: 'Tell us about your work',
                desc: 'Add your experience, projects, and bio. Upload your CV to auto-fill. Takes about 3 minutes.',
              },
              {
                step: '02',
                title: 'We tell your story',
                desc: 'We rewrite your experience into professional portfolio. This is the part most people spend weeks on. You skip it entirely.',
              },
              {
                step: '03',
                title: 'Publish and share',
                desc: 'Your portfolio goes live !!! A real link you can add to your CV, LinkedIn, and job applications today. Switch templates anytime, changes go live instantly.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`p-8 sm:p-10 bg-white${i < 2 ? ' border-b sm:border-b-0 sm:border-r border-gray-200' : ''}`}
              >
                <div className="text-sm font-bold text-[#0A66C2] tracking-widest mb-4">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-base text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Templates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Minimal */}
            <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex-1 bg-white p-8 border-b border-gray-100 min-h-[200px]">
                <div className="h-5 bg-gray-900 w-36 mb-2" style={{ borderRadius: 2 }} />
                <div className="w-8 h-0.5 bg-[#0A66C2] my-3" />
                <div className="h-2.5 bg-gray-200 w-28 mb-5" />
                <div className="h-2 bg-gray-100 w-full mb-1.5" />
                <div className="h-2 bg-gray-100 w-5/6 mb-5" />
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="h-2.5 bg-gray-800 w-40 mb-3" />
                  <div className="h-1.5 bg-gray-100 w-full mb-1.5" />
                  <div className="h-1.5 bg-gray-100 w-4/5 mb-3" />
                  <div className="flex gap-1.5">
                    {['React', 'TypeScript', 'Node'].map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="font-semibold text-gray-900">Minimal</p>
                <p className="text-sm text-gray-400 mt-0.5">Clean, editorial. Works for any role.</p>
              </div>
            </div>

            {/* Bold */}
            <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex-1 bg-[#0D1117] p-8 border-b border-[#1C2128] min-h-[200px]">
                <div className="flex gap-5">
                  <div className="w-24 flex-shrink-0 flex flex-col gap-2.5 border-r border-[#1C2128] pr-4">
                    <div className="h-3 bg-[#F0F6FF] rounded w-full mb-1" />
                    <div className="h-2 bg-[#58A6FF] rounded w-3/4" />
                    <div className="h-px bg-[#1C2128] w-full my-1" />
                    {['About', 'Projects', 'Contact'].map((t) => (
                      <div key={t} className="h-2 bg-[#1C2128] rounded w-full" />
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col gap-2.5">
                    <div className="h-2 bg-[#8B949E] rounded w-24 mb-1" />
                    <div className="h-4 bg-[#F0F6FF] rounded w-full" />
                    <div className="h-2.5 bg-gradient-to-r from-[#F0F6FF] to-[#58A6FF] rounded w-5/6 opacity-60" />
                    <div className="w-8 h-0.5 bg-[#58A6FF] mt-1 mb-2" />
                    <div className="bg-[#1C2128] border border-[#30363D] rounded-lg p-3" style={{ borderLeft: '2px solid #58A6FF' }}>
                      <div className="h-2.5 bg-[#F0F6FF] rounded w-3/4 mb-2" />
                      <div className="h-2 bg-[#8B949E] rounded w-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="font-semibold text-gray-900">Bold</p>
                <p className="text-sm text-gray-400 mt-0.5">Dark, developer-style. Built for engineers.</p>
              </div>
            </div>

            {/* Creative */}
            <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex-1 bg-[#f5f2eb] p-8 border-b border-[#d4cfc2] min-h-[200px]">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="h-5 bg-[#0d0d0d] w-32" style={{ borderRadius: 0 }} />
                    <div className="h-2 bg-[#d4cfc2] w-40 mt-2" style={{ borderRadius: 0 }} />
                  </div>
                  <div className="h-2 bg-[#c8401a] w-14" style={{ borderRadius: 0 }} />
                </div>
                <div className="border-t border-[#d4cfc2] pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-2 bg-[#7a7060] w-full mb-2" style={{ borderRadius: 0 }} />
                    <div className="h-1.5 bg-[#d4cfc2] w-4/5 mb-1.5" style={{ borderRadius: 0 }} />
                    <div className="h-1.5 bg-[#d4cfc2] w-3/5" style={{ borderRadius: 0 }} />
                  </div>
                  <div>
                    <div className="h-5 bg-[#c8401a] w-14 mb-2" style={{ borderRadius: 0 }} />
                    <div className="h-1.5 bg-[#d4cfc2] w-full mb-1.5" style={{ borderRadius: 0 }} />
                    <div className="h-1.5 bg-[#d4cfc2] w-4/5" style={{ borderRadius: 0 }} />
                  </div>
                </div>
                <div className="flex gap-1.5 mt-4">
                  {['AI', 'Python', 'SaaS'].map((t) => (
                    <span key={t} className="text-[9px] px-2 py-0.5 border border-[#d4cfc2] text-[#7a7060]" style={{ borderRadius: 0 }}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="font-semibold text-gray-900">Creative</p>
                <p className="text-sm text-gray-400 mt-0.5">Warm editorial grid. For builders and makers.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

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
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0A0A0A] leading-tight mb-4">
            Your work is already valuable.<br />It just needs to be seen.
          </h2>
          <p className="text-lg sm:text-xl font-medium text-gray-600 mb-8">
            Build your portfolio in the next 3 minutes.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Build My Portfolio →
          </Link>
          <p className="text-sm text-gray-400 mt-4">Free to build and preview. No credit card needed. 7-day refund if you publish and change your mind.</p>
        </div>
      </section>

      <SupportButton />

      {/* ── SEO prose — crawlable, not visually prominent ── */}
      <section className="w-full border-t border-gray-50 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-12 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">The fastest way to look hireable online</h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
            LivePortfolio helps anyone build a professional portfolio website — no design or coding skills needed.
            Upload your CV or answer a few questions, and we tell your story — turning your raw experience into polished, professional copy.
            Share your portfolio link on LinkedIn, via WhatsApp, in job applications, or anywhere you want to be found.
            See when someone views your profile, what country they're from, and what brought them there.
            Whether you&apos;re a developer, designer, data scientist, product manager, or career switcher, your online presence starts here.
            Free to preview. No credit card needed.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>

          {/* Contact links */}
          <div className="flex items-center gap-5">
            <a
              href="mailto:support@ecotronicsenterprise.com"
              className="flex items-center gap-1.5 hover:text-[#0A66C2] transition-colors"
              aria-label="Email us"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Email us
            </a>
          </div>

          <div className="flex gap-6">
            <a href="/blog" className="hover:text-gray-600 transition-colors">Blog</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="https://ecotronicsenterprise.com" className="hover:text-gray-600 transition-colors">Ecotronics</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
