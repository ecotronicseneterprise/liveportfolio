import { CREATE_HREF } from '@/lib/onboarding/entry'
import CookieSettingsLink from '@/components/CookieSettingsLink'
import { BILLING_COPY } from '@/lib/billing/copy'
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
import ContactLinks from '@/components/ContactLinks'
import PricingSection from '@/components/PricingSection'
import HeroSpecimen from '@/components/landing/HeroSpecimen'
import LooksSection from '@/components/landing/LooksSection'
import { studioFonts as landingFonts } from '@/components/blocks/looks/fonts-studio'
import { t } from '@/lib/onboarding/t'
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
        text: 'Building and previewing your portfolio is completely free — no credit card required. You only pay when you are ready to publish your portfolio live and make it shareable. Plans start from ₦15,000 for 12 months (about $10, charged in Naira).',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use my own domain name with LivePortfolio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your portfolio publishes at liveportfolio.site/yourname by default. Custom domains are not available yet.',
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
        text: 'Yes — LivePortfolio is built with African tech professionals in mind. Basic is ₦15,000 for 12 months (about $10, charged in Naira), payments are accepted via Paystack, and the AI is trained to present your experience in a way that resonates with both local and international remote employers.',
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
    a: <>Building and previewing your portfolio is completely free — no credit card required. You only pay when you are ready to publish. Plans start from <LocalisedPrice ngn="₦15,000 for 12 months" usd="$10" />.</>,
  },
  {
    q: 'Can I use my own domain name with LivePortfolio?',
    a: 'Your portfolio publishes at liveportfolio.site/yourname by default. Custom domains are not available yet.',
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
    a: <>Yes — LivePortfolio is built with African tech professionals in mind. Plans are priced in Naira (<LocalisedPrice ngn="₦15,000 for 12 months for Basic" usd="$10" />), payments are accepted via Paystack, and the AI presents your experience in a way that resonates with both local and international remote employers.</>,
  },
  {
    q: 'How does the AI career score work?',
    a: 'When your portfolio is published, LivePortfolio analyses it across key dimensions — completeness, project depth, skills clarity, and professional presentation — and gives you a score out of 100. Clicking any gap takes you directly to the section to improve it.',
  },
]

export default function LandingPage() {
  return (
    <div className={`lpl ${landingFonts} min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden`}>
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

      {/* ── Hero: the headline, and a real portfolio drawn by the block renderer (invented person) with a CSS-only switch between the three looks ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-8 sm:pt-14 lg:pt-20 pb-12 lg:pb-20 hero-grid">
          <div className="flex flex-col">
            <h1 className="hero-h1">{t('landing.h1')}</h1>
            <p className="hero-body">{t('landing.heroBody')}</p>
            <p className="speakable hero-lead">{t('landing.speakable')}</p>
            <p className="hero-aud">{t('landing.heroAudience')}</p>
            <div>
              <Link href={CREATE_HREF} className="hero-cta">{t('landing.cta')}</Link>
            </div>
            <p className="hero-note">{t('landing.ctaNote')}</p>
            <div style={{ minHeight: 24 }}><PublishedCount /></div>
          </div>
          <HeroSpecimen />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-8 leading-tight">{t('landing.howTitle')}</h2>
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
                <div className="text-sm font-bold text-[#084D9A] mb-4" aria-hidden="true">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-base text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-6">
            Not sure <Link href="/what-is-a-portfolio" className="text-[#0A66C2] underline underline-offset-2 hover:text-[#084D9A]">what a portfolio is</Link> and whether you need one? We explain it here.
          </p>
        </div>
      </section>

      {/* ── The three looks ── */}
      <LooksSection />

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── FAQ ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-8 leading-tight">{t('landing.faqTitle')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={item.q}
                className={`group bg-white${i % 2 === 0 ? ' lg:border-r border-gray-100' : ''}${i < FAQ_ITEMS.length - 2 ? ' border-b border-gray-100' : ''}`}
              >
                <summary className="flex items-center justify-between px-6 sm:px-8 py-5 cursor-pointer list-none gap-4">
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <span className="text-gray-600 group-open:rotate-180 transition-transform text-xs flex-shrink-0">▼</span>
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
            href={CREATE_HREF}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Build My Portfolio →
          </Link>
          <p className="text-sm text-gray-500 mt-4">{BILLING_COPY.landingNote}</p>
        </div>
      </section>

      {/* ── SEO prose — crawlable, not visually prominent ── */}
      <section className="w-full border-t border-gray-50 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-12 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">The fastest way to look hireable online</h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-[34rem]">
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
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-600">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>

          {/* Contact links */}
          <ContactLinks />

          <div className="flex gap-6">
            <a href="/blog" className="hover:text-gray-600 transition-colors">Blog</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
            <CookieSettingsLink />
            <a href="https://ecotronicsenterprise.com" className="hover:text-gray-600 transition-colors">Ecotronics</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
