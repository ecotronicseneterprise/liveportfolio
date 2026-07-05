import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: "How to Build a Portfolio With No Experience — Nigeria Guide | LivePortfolio",
  description: "No full-time job yet? Here's how to build a real portfolio using coursework, personal projects, and freelance work — even without a single official role.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'How to Build a Portfolio With No Experience — Nigeria Guide',
    description: "No full-time job yet? Here's how to build a real portfolio using coursework, personal projects, and freelance work.",
    url: 'https://liveportfolio.site/blog/how-to-build-a-portfolio-with-no-experience-nigeria',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-17T00:00:00Z',
    modifiedTime: '2026-07-17T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/how-to-build-a-portfolio-with-no-experience-nigeria',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'How to Build a Portfolio With No Experience — Nigeria', item: 'https://liveportfolio.site/blog/how-to-build-a-portfolio-with-no-experience-nigeria' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: "How to Build a Portfolio With No Experience — Yes, It's Possible",
  description: "No full-time job yet? Here's how to build a real portfolio using coursework, personal projects, and freelance work.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-17T00:00:00Z',
  dateModified: '2026-07-17T00:00:00Z',
  url: 'https://liveportfolio.site/blog/how-to-build-a-portfolio-with-no-experience-nigeria',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/how-to-build-a-portfolio-with-no-experience-nigeria' },
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
            For beginners
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            How to Build a Portfolio With No Experience — Yes, It&apos;s Possible
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            &ldquo;No experience&rdquo; almost always means &ldquo;no full-time job title.&rdquo; That is not the same as nothing to show.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Learning how to build a portfolio with no experience in Nigeria is one of the most common starting points for early-career tech professionals — and the good news is that &ldquo;no experience&rdquo; usually means &ldquo;no full-time job title,&rdquo; not &ldquo;nothing to show.&rdquo;
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          The distinction matters. Most people who say they have nothing to put in a portfolio are wrong. They have coursework, personal projects, freelance gigs, hackathon entries, and open-source contributions. They just do not think those count. They do.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">First: Redefine What Counts</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Experience in a portfolio context does not require a salary and an employer. It requires: a problem you solved, a skill you applied, and a result you can describe. Where it happened matters less than you think.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Here is what actually counts as portfolio material:
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-3">
          <strong>Coursework projects.</strong> That database you built for your final-year project? That counts. The mobile app you made for a class assignment? That counts. If you built it, learned from it, and can describe what it does and what you learned — it is portfolio material.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          <strong>Personal projects.</strong> Did you build something for yourself? A script that automated something annoying? A website for your church or community group? These are projects. They have users, even if the first user was you.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          <strong>Freelance work.</strong> Any paid work for anyone — designing a logo, fixing a bug, setting up a small business website — is professional experience. Even one small gig for a neighbour is real client work.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          <strong>Open-source contributions.</strong> Any contribution to an open-source project, even documentation, is evidence of professional-level engagement.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          <strong>Hackathons and competitions.</strong> Even if you did not win, building something under time pressure in a team setting is demonstrably impressive.
        </p>

        <Callout emoji="💡" title="One rule to remember" color="green">
          If you built it and can explain what it does and what you learned — it belongs in your portfolio. The entry bar is lower than you think.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What to Write When You Do Not Have Outcomes to Report</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          When you have real work experience, you lead with outcomes: built X, which resulted in Y. When you do not, you lead with the problem and the process:
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-4 italic">
          &ldquo;Built a [project type] that [what it does]. Used [technologies]. The most challenging part was [honest difficulty]. What I would do differently: [what you learned].&rdquo;
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          This is accurate for junior-level work and experienced reviewers respect it. Claiming outcomes you do not have is immediately detectable. Honest learning trajectory is not.
        </p>

        <PullQuote>
          Two strong projects described honestly beat six half-finished ones with no context.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">How Many Projects Do You Need?</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Two strong projects are more valuable than six weak ones. Minimum: two. Target: three or four. Beyond six, portfolios start to feel exhausting rather than impressive.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Build It Now, Improve It Later</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The biggest mistake early-career professionals make is waiting until they have &ldquo;enough&rdquo; to build a portfolio. There is no such thing. Build it with what you have today, then add as you build more.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          A <a href="/free-portfolio-website" className="text-[#0A66C2] underline underline-offset-2">free portfolio website</a> lets you do this with no upfront cost — build and preview completely free, publish when you are ready.
        </p>

        <KeyTakeaway>
          No experience does not mean no portfolio. Coursework, personal projects, freelance work, and open-source contributions all count. Pick your two strongest projects, describe them honestly with problem and outcome, and publish. You can always add more later — but you cannot apply with a portfolio you have not built yet.
        </KeyTakeaway>

        <CTASection
          headline="Build your first portfolio today"
          sub="Free to build and preview. Add your projects and we write the copy for you."
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
          { title: 'Portfolio for Bootcamp Graduates: How to Get Hired With Little Experience', slug: 'portfolio-for-bootcamp-graduates', time: '6 min' },
          { title: 'CV vs Portfolio: What Nigerian Job Seekers Often Get Wrong', slug: 'cv-vs-portfolio-nigeria', time: '4 min' },
        ]} />
      </article>
    </>
  )
}
