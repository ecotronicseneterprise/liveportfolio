import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LandingNav from '@/components/LandingNav'
import ContactLinks from '@/components/ContactLinks'
import CookieSettingsLink from '@/components/CookieSettingsLink'
import { TemplateThumb } from '@/components/onboarding/TemplateGallery'
import { CREATE_HREF } from '@/lib/onboarding/entry'
import { safeJsonLd } from '@/lib/json-ld'
import { SAMPLE_PEOPLE } from '@/lib/blocks/sample'
import { ROLE_PAGES, ROLE_SLUGS, roleBySlug } from '@/lib/seo/roles'

const SITE = 'https://liveportfolio.site'

// Only the listed roles exist; anything else is a 404 (and never reaches the portfolio renderer).
export const dynamicParams = false
export function generateStaticParams() {
  return ROLE_SLUGS.map((role) => ({ role }))
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params
  const page = roleBySlug(role)
  if (!page) return {}
  const url = `${SITE}/portfolio-for/${page.slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, type: 'website' },
  }
}

export default async function RolePortfolioPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const page = roleBySlug(role)
  if (!page) notFound()

  const cta = `${CREATE_HREF}?utm_source=seo&utm_medium=role-page&utm_campaign=${page.slug}`
  const related = ROLE_PAGES.filter((r) => r.slug !== page.slug && (r.kind === page.kind || r.slug === 'fresh-graduates')).slice(0, 4)
  const url = `${SITE}/portfolio-for/${page.slug}`

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const crumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LivePortfolio', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Portfolios by profession', item: `${SITE}/portfolio-for` },
      { '@type': 'ListItem', position: 3, name: page.plural, item: url },
    ],
  }

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbLd) }} />
      <LandingNav />

      {/* Hero */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <p className="text-sm text-gray-500 mb-5">
            <Link href="/portfolio-for" className="hover:text-gray-800 underline-offset-2 hover:underline">Portfolios by profession</Link>
            <span aria-hidden="true"> / </span>
            <span>{page.plural}</span>
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">{page.h1}</h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl">{page.intro}</p>
          <div className="flex flex-col gap-3">
            <Link href={cta} className="inline-flex w-fit items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20">
              Build my portfolio, free →
            </Link>
            <span className="text-sm text-gray-500">Start from your CV or type your details. Preview free, and pay only when you publish.</span>
          </div>
        </div>
      </section>

      {/* A sample, so the page is not only words */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What it can look like</h2>
          <div className="max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <TemplateThumb id="minimal" content={SAMPLE_PEOPLE[page.kind]} height={420} eager />
          </div>
          <p className="mt-3 text-sm text-gray-500">A sample page with an invented person. Yours is built from your own details.</p>
        </div>
      </section>

      {/* What to show */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What to put on your page</h2>
          <ul className="max-w-2xl space-y-3 text-base text-gray-700 leading-[1.7]">
            {page.show.map((item) => (
              <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0A66C2]" aria-hidden="true" /><span>{item}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Starting out */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-2">Not much to show yet?</h2>
          <p className="text-base text-gray-600 leading-[1.7] max-w-2xl mb-5">You can start with something small that you do yourself. Three ideas:</p>
          <ul className="max-w-2xl space-y-3 text-base text-gray-700 leading-[1.7]">
            {page.ideas.map((item) => (
              <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" aria-hidden="true" /><span>{item}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Headlines + mistakes */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Headline examples</h2>
            <ul className="space-y-3 text-base text-gray-800 leading-[1.6]">
              {page.headlines.map((h) => <li key={h} className="rounded-xl border border-gray-200 bg-white px-4 py-3">{h}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Common mistakes</h2>
            <ul className="space-y-3 text-base text-gray-700 leading-[1.7]">
              {page.mistakes.map((m) => (
                <li key={m} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" aria-hidden="true" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Questions</h2>
          <div className="max-w-3xl border border-gray-100 rounded-2xl overflow-hidden bg-white">
            {page.faq.map((item, i) => (
              <details key={item.q} className={`group${i < page.faq.length - 1 ? ' border-b border-gray-100' : ''}`}>
                <summary className="flex items-center justify-between px-6 sm:px-8 py-5 cursor-pointer list-none gap-4">
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs flex-shrink-0" aria-hidden="true">▼</span>
                </summary>
                <div className="px-6 sm:px-8 pb-5 text-base text-gray-600 leading-[1.7]">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-12">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Portfolios for other professions</h2>
          <ul className="flex flex-wrap gap-3">
            {related.map((r) => (
              <li key={r.slug}><Link href={`/portfolio-for/${r.slug}`} className="inline-flex min-h-[44px] items-center rounded-full border border-gray-200 px-4 text-sm text-gray-800 hover:border-[#0A66C2] hover:text-[#0A66C2]">{r.plural}</Link></li>
            ))}
            <li><Link href="/portfolio-for" className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-[#0A66C2] hover:underline">See all →</Link></li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0A0A0A] leading-tight mb-4">Your work deserves to be seen.</h2>
          <p className="text-lg sm:text-xl font-medium text-gray-600 mb-8">Build your portfolio free. Publish when you&apos;re ready.</p>
          <Link href={cta} className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors">
            Build my portfolio, free →
          </Link>
        </div>
      </section>

      <div className="flex justify-center py-6 text-xs text-gray-400"><ContactLinks /></div>
      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-6">
            <a href="/portfolio-for" className="hover:text-gray-600 transition-colors">By profession</a>
            <a href="/blog" className="hover:text-gray-600 transition-colors">Blog</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
            <CookieSettingsLink />
          </div>
        </div>
      </footer>
    </div>
  )
}
