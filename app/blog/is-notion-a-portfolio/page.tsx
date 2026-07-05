import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: "Is Notion a Portfolio? It's Clever — Here's Where It Breaks Down | LivePortfolio",
  description: "Notion portfolio pages are surprisingly popular. Here's why people build them, what actually works, and the three places where a real portfolio website pulls ahead.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: "Is Notion a Portfolio? It's Clever — Here's Where It Breaks Down",
    description: "Notion portfolio pages are surprisingly popular. Here's what works and where a real portfolio website pulls ahead.",
    url: 'https://liveportfolio.site/blog/is-notion-a-portfolio',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-15T00:00:00Z',
    modifiedTime: '2026-07-15T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/is-notion-a-portfolio',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'Is Notion a Portfolio?', item: 'https://liveportfolio.site/blog/is-notion-a-portfolio' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: "Is Notion a Portfolio? It's a Clever Workaround — Here's Where It Breaks Down",
  description: "Notion portfolio pages are surprisingly popular. Here's what works and where a real portfolio website pulls ahead.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-15T00:00:00Z',
  dateModified: '2026-07-15T00:00:00Z',
  url: 'https://liveportfolio.site/blog/is-notion-a-portfolio',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/is-notion-a-portfolio' },
}

export default function Article() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#E8F0F9] px-5 py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div style={{ marginBottom: 16 }}>
            <a href="/blog" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Blog</a>
          </div>
          <span className="inline-block text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-4 bg-white px-3 py-1 rounded-full">
            Tool comparison
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            Is Notion a Portfolio? It&apos;s a Clever Workaround — Here&apos;s Where It Breaks Down
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Notion portfolios are more popular than you might think. Here is what they do well and where the gaps start to show.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Whether Notion is a portfolio depends on what you need a portfolio to do — and for three specific jobs, Notion falls short.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          That said, Notion portfolios are more popular than most people realise, and for good reason. Understanding where they work and where they do not will help you decide if it is the right starting point for you.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Why Notion Portfolios Are Surprisingly Popular</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Notion is free, flexible, and surprisingly decent at presenting structured information. If you are not a developer, the alternatives used to be: learn to code, pay for a Squarespace subscription, or use a template that looks like every other template. Notion offered a third path — a free, shareable workspace you could set up in an afternoon.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          For students and recent graduates who need something now and have nothing else ready, a Notion portfolio is meaningfully better than no portfolio. That is worth acknowledging.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Where It Works Well</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Notion is genuinely good at organising projects into a structured layout, showing written case studies, and linking to external work — videos, GitHub repos, design files. If your portfolio is primarily written content, Notion handles this reasonably.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Where It Breaks Down</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <strong>It looks like Notion, not like you.</strong> Every Notion page shares the same interface. The same icon, the same font, the same structure. A recruiter who has seen three Notion portfolios in the same week knows immediately that is what they are looking at. The visual impression is &ldquo;organised person&rdquo; not &ldquo;this person thought carefully about their personal brand.&rdquo;
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <strong>The URL is Notion&apos;s, not yours.</strong> Your portfolio lives at <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">notion.so/yourname</code> or a long auto-generated URL. You can use third-party services to put it on a custom domain, but at that point you are paying for a workaround when you could use a tool built for this purpose.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          <strong>You get zero data.</strong> No analytics. No way to know if the link was opened, how long someone spent on it, or whether they shared it. You send a link and then you wait with no information.
        </p>

        <PullQuote>
          Notion is a great workspace tool being used to do a job it was not built for.
        </PullQuote>

        <Callout emoji="⚠️" title="The analytics gap is the one that hurts most" color="amber">
          When you are actively applying for roles, knowing whether your portfolio link is being opened changes everything. It tells you if your applications are getting read. Notion gives you nothing. A real portfolio website shows you who visited, from where, and when.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What to Do With Your Notion Portfolio</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If you have built one and it is currently what you have, keep it for now — it is better than nothing. Build a real portfolio alongside it. A <a href="/cv-to-portfolio" className="text-[#0A66C2] underline underline-offset-2">CV to portfolio website</a> takes your existing experience and turns it into a real, shareable website in minutes. Put the real portfolio URL in your LinkedIn and email signature. Use the Notion page as a detailed case study resource if you want to preserve the writing.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently Asked Questions</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Can I use Notion as a portfolio if I&apos;m just starting out?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Yes, as a starting point. The important thing is to have something rather than nothing. But plan to move to a real portfolio website as soon as you have time — the difference in professional impression is meaningful.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Does Notion have good SEO?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Notion pages can be indexed by Google, but they rank as Notion content — not as a personal professional page. A dedicated portfolio website at your own URL is significantly stronger for appearing in search results for your name.
        </p>

        <KeyTakeaway>
          Notion is a solid starting point if you need something today and have no budget. The moment you want your own URL, visitor analytics, or a design that reflects your personal brand — you need a real portfolio website. Build it alongside your Notion page, not instead of it.
        </KeyTakeaway>

        <CTASection
          headline="Move from Notion to a real portfolio website"
          sub="Your experience is already written. We turn it into a professional website in minutes."
        />

        <div className="mt-12 pt-8 border-t border-gray-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 overflow-hidden">
            <img src="/clifford-avatar.jpg" alt="Clifford Nwanna" width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Clifford Nwanna</p>
            <p className="text-sm text-gray-500 mt-1">
              Data Scientist and AI Engineer at Wema Bank. Builder of LivePortfolio, JARVIS, and the Gateman IoT attendance system. Electronics &amp; Computer Engineering graduate, based in Lagos, Nigeria.
            </p>
          </div>
        </div>

        <RelatedArticles articles={[
          { title: "Is Canva a Portfolio Website? Here's What It's Missing", slug: 'is-canva-a-portfolio-website', time: '5 min' },
          { title: 'How to Create a Developer Portfolio That Gets You Hired', slug: 'how-to-create-a-developer-portfolio', time: '6 min' },
        ]} />
      </article>
    </>
  )
}
