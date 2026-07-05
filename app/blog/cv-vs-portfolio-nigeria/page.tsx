import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'CV vs Portfolio: What Nigerian Job Seekers Often Get Wrong | LivePortfolio',
  description: 'Should you send a CV, a portfolio, or both? Here\'s how Nigerian professionals can use each one correctly — and the common mistake that costs interviews.',
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'CV vs Portfolio: What Nigerian Job Seekers Often Get Wrong',
    description: "Should you send a CV, a portfolio, or both? Here's how to use each one correctly.",
    url: 'https://liveportfolio.site/blog/cv-vs-portfolio-nigeria',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-16T00:00:00Z',
    modifiedTime: '2026-07-16T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/cv-vs-portfolio-nigeria',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'CV vs Portfolio Nigeria', item: 'https://liveportfolio.site/blog/cv-vs-portfolio-nigeria' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'CV vs Portfolio: What Nigerian Job Seekers Often Get Wrong',
  description: "Should you send a CV, a portfolio, or both? Here's how to use each one correctly.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-16T00:00:00Z',
  dateModified: '2026-07-16T00:00:00Z',
  url: 'https://liveportfolio.site/blog/cv-vs-portfolio-nigeria',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/cv-vs-portfolio-nigeria' },
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
            Career strategy
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            CV vs Portfolio: What Nigerian Job Seekers Often Get Wrong
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            They are not the same document. They are not alternatives. Here is how to use both correctly.
          </p>
          <p className="text-xs text-gray-400">4 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          The CV vs portfolio question comes up constantly for Nigerian job seekers — and the answer is almost always that you need both, but not for the same reason.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          They do different jobs at different stages of the hiring process. Treating them as alternatives is the mistake that costs interviews.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What a CV Actually Does</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A CV is a filter document. Its job is to get you past the first cut — through automated screening, through a recruiter&apos;s 10-second scan, to the point where someone decides you are worth a closer look.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A CV succeeds when it is clean, keyword-matched to the job description, and makes it immediately obvious that you have the required experience. It is an argument for a conversation, not the conversation itself.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          CVs are also what most Nigerian employers — large corporations, banks, government-adjacent organisations — are set up to process. For local roles, a strong CV is non-negotiable.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What a Portfolio Actually Does</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A portfolio is a proof document. Its job is to convince someone who is already interested in you that you are the right choice. It answers: can they actually do what they say they can?
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A portfolio works best after your CV has opened the door. Once a recruiter wants to learn more, your portfolio does the convincing. It shows specific work, specific outcomes, and the quality of your thinking.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          For international remote roles, a portfolio matters earlier — it sometimes bypasses the CV stage entirely, especially at startups that care more about what you have built than where you studied.
        </p>

        <PullQuote>
          CV gets you noticed. Portfolio gets you remembered. Interview gets you hired.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The Mistake That Costs Interviews</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The most common mistake Nigerian job seekers make is treating the CV and portfolio as alternatives. They either send only a CV and wonder why international companies are not responding, or they build a portfolio and stop updating their CV.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Neither works. They are different tools for different moments in the same process.
        </p>

        <Callout emoji="💡" title="Practical rules by context" color="blue">
          <strong>For local Nigerian roles:</strong> lead with your CV. Include your portfolio URL but do not expect it to be the primary evaluation tool.<br /><br />
          <strong>For international remote roles:</strong> lead with both. A portfolio link in your first email or application is expected, not optional.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">How to Have Both With Minimal Extra Effort</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Always have an updated CV. Even if your portfolio is excellent, many application forms require a CV upload.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Always have a portfolio URL. Put it in your CV header, your LinkedIn Featured section, and your email signature.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          A <a href="/cv-to-portfolio" className="text-[#0A66C2] underline underline-offset-2">CV to portfolio website</a> turns your existing CV into a live portfolio in minutes — so you have both, with almost no extra effort.
        </p>

        <KeyTakeaway>
          CV and portfolio are not alternatives. They serve different purposes at different stages. Your CV gets you through the door; your portfolio makes them want to hire you. Nigerian job seekers who have both — and use them in the right context — consistently outperform those who rely on one alone.
        </KeyTakeaway>

        <CTASection
          headline="Turn your CV into a portfolio in minutes"
          sub="Same experience, better format. A live website you can link anywhere."
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
          { title: 'Remote Jobs for Nigerians: The Portfolio Trick That Gets You Noticed', slug: 'remote-jobs-for-nigerians', time: '6 min' },
          { title: 'How to Get a Remote Tech Job From Nigeria in 2026', slug: 'how-to-get-a-remote-tech-job-from-nigeria', time: '7 min' },
        ]} />
      </article>
    </>
  )
}
