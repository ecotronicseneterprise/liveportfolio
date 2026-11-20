import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import ContactLinks from '@/components/ContactLinks'
import CookieSettingsLink from '@/components/CookieSettingsLink'
import { CREATE_HREF } from '@/lib/onboarding/entry'
import { safeJsonLd } from '@/lib/json-ld'
import { ROLE_PAGES } from '@/lib/seo/roles'

const SITE = 'https://liveportfolio.site'

export const metadata: Metadata = {
  title: 'Portfolio Websites by Profession: What to Show and How | LivePortfolio',
  description: 'Guides for building a portfolio website in your profession: developers, designers, analysts, accountants, nurses, doctors, graduates and more. Build and preview free.',
  alternates: { canonical: `${SITE}/portfolio-for` },
  openGraph: {
    title: 'Portfolio Websites by Profession | LivePortfolio',
    description: 'What to show on your portfolio, by profession. Build and preview free.',
    url: `${SITE}/portfolio-for`,
    type: 'website',
  },
}

export default function PortfolioForHub() {
  const cta = `${CREATE_HREF}?utm_source=seo&utm_medium=role-hub&utm_campaign=hub`
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ROLE_PAGES.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: `Portfolio website for ${r.plural}`, url: `${SITE}/portfolio-for/${r.slug}` })),
  }
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(listLd) }} />
      <LandingNav />

      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">A portfolio website for your profession</h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl">
            What a good portfolio shows depends on the work you do. Pick your profession for what to put on the page, how to start if you have little to show, and the mistakes to avoid.
          </p>
          <Link href={cta} className="inline-flex w-fit items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20">
            Build my portfolio, free →
          </Link>
        </div>
      </section>

      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_PAGES.map((r) => (
              <li key={r.slug}>
                <Link href={`/portfolio-for/${r.slug}`} className="block h-full rounded-2xl border border-gray-200 bg-white p-6 hover:border-[#0A66C2] transition-colors">
                  <span className="block text-base font-semibold text-gray-900 capitalize">{r.plural}</span>
                  <span className="mt-2 block text-sm text-gray-600 leading-[1.6]">{r.show[0]}</span>
                  <span className="mt-4 block text-sm font-semibold text-[#0A66C2]">Read the guide →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex justify-center py-6 text-xs text-gray-400"><ContactLinks /></div>
      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-6">
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
