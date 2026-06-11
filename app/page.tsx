import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import SupportButton from '@/components/SupportButton'
import PricingSection from '@/components/PricingSection'
import PortfolioShowcase from '@/components/PortfolioShowcase'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LivePortfolio',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://liveportfolio.site',
  description: 'Create a professional portfolio website for job applications in minutes. Upload your CV, get AI-written copy, and share your link with recruiters.',
  offers: {
    '@type': 'Offer',
    price: '15000',
    priceCurrency: 'NGN',
    priceValidUntil: '2027-12-31',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '47',
  },
}


const FAQ_ITEMS = [
  {
    q: 'Can I preview before paying?',
    a: 'Yes. You can build and preview your full portfolio for free before deciding to publish. No payment needed to see your results.',
  },
  {
    q: 'How does billing work?',
    a: 'Plans are billed annually — ₦15,000/year for Basic, ₦45,000/year for Pro (approximately $10 and $30). You get a 7-day refund guarantee, no questions asked. Cancel anytime.',
  },
  {
    q: 'Can I edit my portfolio after publishing?',
    a: 'Yes. Log into your dashboard to edit any text, switch templates, or update your projects. Changes go live instantly — no re-generation needed.',
  },
  {
    q: 'What do I get when I publish?',
    a: 'Basic gives you a live portfolio at yourname.liveportfolio.site, all three templates, and full editing from your dashboard. Pro adds an analytics dashboard (see who views you and from where), QR code sharing, weekly career score, custom domain, and an export pack (PDF, LinkedIn summary, cover letter).',
  },
  {
    q: 'Who is this for?',
    a: 'Developers, designers, data scientists, product managers, freelancers — anyone who wants to present their work professionally and know if recruiters are finding them.',
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

      {/* ── Nav ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">

        {/* Headline + CTA — full width, large padding */}
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
              <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
              Built for professionals, freelancers, and job seekers.
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0A0A0A] leading-[1.05]">
              Turn your experience into a portfolio recruiters actually read.
            </h1>
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
              Not hearing back after sending out multiple job applications hurts. It makes you question everything you've built. A portfolio won't fix the silence, but it makes sure they can't ignore what you've done.<br /><br />Upload your CV or answer a few questions and we turn your experience into a professional portfolio website. Your page is ready in minutes. Share the link in your next application and know exactly when someone views it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/create"
                className="px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20"
              >
                Create My Portfolio →
              </Link>
              <span className="text-sm text-gray-400">Free to build. From ₦15,000/year to publish.</span>
            </div>
          </div>
        </div>

        <PortfolioShowcase />

      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-xs font-bold text-[#0A66C2] tracking-widest uppercase mb-4">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                step: '01',
                title: 'Tell us about your work',
                desc: 'Add your experience, projects, and bio. Upload your CV to auto-fill. Takes about 3 minutes.',
              },
              {
                step: '02',
                title: 'We write your copy',
                desc: 'We rewrite everything into clean, professional language — specific, human, recruiter-ready. No buzzwords.',
              },
              {
                step: '03',
                title: 'Publish and share',
                desc: 'Your portfolio goes live at yourname.liveportfolio.site. Not happy with your template? Switch in one click — your portfolio updates live.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`p-8 sm:p-10 bg-white${i < 2 ? ' border-b sm:border-b-0 sm:border-r border-gray-200' : ''}`}
              >
                <div className="text-xs font-bold text-[#0A66C2] tracking-widest mb-4">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-xs font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Templates</p>
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
          <p className="text-xs font-bold text-[#0A66C2] tracking-widest uppercase mb-4">FAQ</p>
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
                <div className="px-6 sm:px-8 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0A0A0A] leading-tight mb-8">
            Your work is already valuable.<br />It just needs to be seen.
          </h2>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Create My Portfolio →
          </Link>
        </div>
      </section>

      <SupportButton />

      {/* ── SEO prose — crawlable, not visually prominent ── */}
      <section className="w-full border-t border-gray-50 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-12 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">The fastest way to look hireable online</h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
            LivePortfolio helps job seekers in Nigeria and across Africa create a professional portfolio website and online CV in minutes — no design or coding skills needed.
            Upload your CV or answer a few questions, and we write your portfolio copy for you: your headline, your project descriptions, your about section.
            Share your portfolio link in job applications, on LinkedIn, or via WhatsApp, and see exactly when recruiters and hiring managers view your profile.
            Whether you&apos;re a developer, designer, data scientist, product manager, or career switcher, a live portfolio page makes you impossible to overlook.
            Start free. Publish from ₦15,000/year. Your online resume website is ready in under 10 minutes.
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
              href="tel:+2349014545622"
              className="flex items-center gap-1.5 hover:text-[#0A66C2] transition-colors"
              aria-label="Call us"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              +234 901 454 5622
            </a>
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
