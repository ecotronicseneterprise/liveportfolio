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
      name: 'What is LivePortfolio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LivePortfolio is an AI-powered portfolio builder that turns your CV into a professional portfolio website in minutes. Upload your CV, the AI writes your story, and you get a live portfolio at liveportfolio.site/yourname — no design skills or coding required.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to create a portfolio with LivePortfolio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most users go from CV upload to a finished, previewable portfolio in under 5 minutes. The AI generation takes 10–15 seconds. Publishing takes as long as choosing a plan.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LivePortfolio free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Building and previewing your portfolio is completely free — no credit card required. You only pay when you are ready to publish your portfolio live and make it shareable. Plans start from ₦15,000 per year in Nigeria.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use my own domain name with LivePortfolio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your portfolio publishes at liveportfolio.site/yourname by default. Custom domain support is available on Pro plans — connect any domain you own to your LivePortfolio page.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LivePortfolio a good alternative to Wix for professionals?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, especially if you want speed over total design control. Wix gives you a blank canvas and hours of work. LivePortfolio gives you a finished, AI-written portfolio in minutes, purpose-built for job seekers and professionals — not general websites.',
      },
    },
    {
      '@type': 'Question',
      name: 'LivePortfolio vs Canva — which is better for job seekers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Canva produces beautiful PDF documents, not real websites. A Canva portfolio cannot be linked to directly, does not appear in Google search results for your name, and gives you no data on who viewed it. LivePortfolio builds an actual website with a real URL, visitor analytics, and proper SEO — better for any situation where you need to send a portfolio link.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LivePortfolio better than just using a LinkedIn profile?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LinkedIn is where recruiters find you. LivePortfolio is what you show them once they do. A LinkedIn profile follows LinkedIn\'s layout and competes for attention within their platform. Your LivePortfolio is your own page, at your own URL, with your own branding — and it tells you when someone from a new country opens it, in real time.',
      },
    },
    {
      '@type': 'Question',
      name: 'What makes LivePortfolio different from other portfolio builders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Three things: the AI writes your portfolio copy from your CV so you start from a finished draft, not a blank page; you can see when someone from a new country opens your portfolio in real time; and it is purpose-built for tech professionals and job seekers, not general website creation.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does LivePortfolio work for Nigerian job seekers and remote workers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — LivePortfolio is built with African tech professionals in mind. Plans are priced in Naira (₦15,000/year for Basic), payments are accepted via Paystack, and the AI is trained to present your experience in a way that resonates with both local and international remote employers.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the AI career score work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When your portfolio is published, LivePortfolio analyses it across key dimensions — completeness, project depth, skills clarity, and professional presentation — and gives you a score out of 100. Clicking any gap in the score takes you directly to the section to improve it.',
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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LivePortfolio',
  url: 'https://liveportfolio.site',
  logo: {
    '@type': 'ImageObject',
    url: 'https://liveportfolio.site/logo-1024.png',
  },
  sameAs: [],
}

const speakableJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'h2', '.speakable'],
  },
  url: 'https://liveportfolio.site',
}


const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'What is LivePortfolio?',
    a: 'LivePortfolio is an AI-powered portfolio builder that turns your CV into a professional portfolio website in minutes. Upload your CV, the AI writes your story, and you get a live portfolio at liveportfolio.site/yourname — no design skills or coding required.',
  },
  {
    q: 'How long does it take to create a portfolio with LivePortfolio?',
    a: 'Most users go from CV upload to a finished, previewable portfolio in under 5 minutes. The AI generation takes 10–15 seconds. Publishing takes as long as choosing a plan.',
  },
  {
    q: 'Is LivePortfolio free?',
    a: <>Building and previewing your portfolio is completely free — no credit card required. You only pay when you are ready to publish. Plans start from <LocalisedPrice ngn="₦15,000/year" usd="$10/year" />.</>,
  },
  {
    q: 'Can I use my own domain name with LivePortfolio?',
    a: 'Your portfolio publishes at liveportfolio.site/yourname by default. Custom domain support is available on Pro plans — connect any domain you own to your LivePortfolio page.',
  },
  {
    q: 'Is LivePortfolio a good alternative to Wix for professionals?',
    a: 'Yes, especially if you want speed over total design control. Wix gives you a blank canvas and hours of work. LivePortfolio gives you a finished, AI-written portfolio in minutes, purpose-built for job seekers and professionals — not general websites.',
  },
  {
    q: 'LivePortfolio vs Canva — which is better for job seekers?',
    a: 'Canva produces beautiful PDF documents, not real websites. A Canva portfolio cannot be linked to directly, does not appear in Google search results for your name, and gives you no data on who viewed it. LivePortfolio builds an actual website with a real URL, visitor analytics, and proper SEO.',
  },
  {
    q: 'Is LivePortfolio better than just using a LinkedIn profile?',
    a: 'LinkedIn is where recruiters find you. LivePortfolio is what you show them once they do. Your LivePortfolio is your own page, at your own URL — and it tells you when someone from a new country opens it, in real time.',
  },
  {
    q: 'What makes LivePortfolio different from other portfolio builders?',
    a: 'Three things: the AI writes your portfolio copy from your CV so you start from a finished draft, not a blank page; you can see when someone from a new country opens your portfolio in real time; and it is purpose-built for tech professionals and job seekers, not general website creation.',
  },
  {
    q: 'Does LivePortfolio work for Nigerian job seekers and remote workers?',
    a: <>Yes — LivePortfolio is built with African tech professionals in mind. Plans are priced in Naira (<LocalisedPrice ngn="₦15,000/year for Basic" usd="$10/year for Basic" />), payments are accepted via Paystack, and the AI presents your experience in a way that resonates with both local and international remote employers.</>,
  },
  {
    q: 'How does the AI career score work?',
    a: 'When your portfolio is published, LivePortfolio analyses it across key dimensions — completeness, project depth, skills clarity, and professional presentation — and gives you a score out of 100. Clicking any gap takes you directly to the section to improve it.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }}
      />

      {/* ── Nav ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-0 lg:pb-0 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Left: headline + CTA */}
          <div className="flex flex-col gap-6 pb-10 lg:pb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium w-fit">
              <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
              For developers, designers, data scientists, graduates and freelancers — anywhere in the world.
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05]">
              Turn Your CV Into a Portfolio in Minutes. No Design Skills Needed
            </h1>
            <p className="speakable text-lg text-gray-500 leading-relaxed">
              LivePortfolio helps professionals turn their work into opportunities.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Upload your CV or tell us your story, and we'll turn it into a professional portfolio website in minutes. Showcase your projects, skills, and achievements with beautiful templates, real-time visitor analytics, and SEO built in. Free to build and preview. No credit card required.
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
              <span className="text-sm text-gray-400">Free to build and preview. No credit card required. Publish only when you're ready.</span>
              <PublishedCount />
            </div>
          </div>

          {/* Right: slideshow — on mobile sits below headline, on desktop side-by-side */}
          <div className="w-full border-t lg:border-t-0 border-gray-100 lg:border-l lg:border-gray-100 -mx-6 sm:-mx-10 lg:-mx-0 lg:self-stretch">
            <PortfolioShowcaseWrapper />
          </div>

        </div>
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
                desc: 'We transform your experience into a professional portfolio. This is the part most people spend weeks on. You skip it entirely.',
              },
              {
                step: '03',
                title: 'Publish and share',
                desc: 'Get a live portfolio you can add to your CV, LinkedIn, job applications, and email signature. Update it anytime, and your changes go live instantly.',
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
                <p className="text-sm text-gray-400 mt-0.5">Designed for developers and technical professionals who want a modern, code-inspired look.</p>
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
                <p className="text-sm text-gray-400 mt-0.5">Warm editorial grid. For designers, founders, and creators. </p>
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
            Build your professional portfolio today and give recruiters, clients, and collaborators a reason to remember you.
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
            LivePortfolio helps anyone build a professional portfolio website. No design or coding skills needed.
            Upload your CV or answer a few questions, and we tell your story. Transforming your raw experience into polished, professional copy.
            Share your portfolio link on LinkedIn, via WhatsApp, in job applications, or anywhere you want to be found.
            See when someone views your profile, what country they're from, and what brought them there.
            Whether you are a developer, designer, engineer, product manager, or career switcher, your online presence starts here.
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
