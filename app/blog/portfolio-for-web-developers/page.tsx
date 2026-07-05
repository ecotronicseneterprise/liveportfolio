import type { Metadata } from 'next'
import { PullQuote, Callout, Checklist, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'Portfolio for Web Developers: The Structure That Actually Gets Read | LivePortfolio',
  description: "Not sure what your developer portfolio needs? Here's the exact section structure recruiters expect — and the mistakes that make good developers look unprepared.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'Portfolio for Web Developers: The Structure That Actually Gets Read',
    description: "The exact section structure recruiters expect — and the mistakes that make good developers look unprepared.",
    url: 'https://liveportfolio.site/blog/portfolio-for-web-developers',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-18T00:00:00Z',
    modifiedTime: '2026-07-18T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/portfolio-for-web-developers',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'Portfolio for Web Developers', item: 'https://liveportfolio.site/blog/portfolio-for-web-developers' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Portfolio for Web Developers: The Structure That Actually Gets Read',
  description: "The exact section structure recruiters expect — and the mistakes that make good developers look unprepared.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-18T00:00:00Z',
  dateModified: '2026-07-18T00:00:00Z',
  url: 'https://liveportfolio.site/blog/portfolio-for-web-developers',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/portfolio-for-web-developers' },
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
            Portfolio structure
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            Portfolio for Web Developers: The Structure That Actually Gets Read
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            The difference between portfolios that get read and portfolios that get closed is almost always structure.
          </p>
          <p className="text-xs text-gray-400">6 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Building a portfolio for web developers follows a specific structure — and the difference between portfolios that get read and portfolios that get closed is almost always whether the structure answers the right questions in the right order.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Most developer portfolios are not bad because of weak projects. They are bad because the structure buries what matters or skips what recruiters need to see.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The Problem With Most Developer Portfolios</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Most developer portfolios have the same issue: they show what was built but not why it matters. A recruiter who is not a developer cannot tell good code from bad by looking at a repository name. What they can evaluate is: is this person&apos;s work clearly explained, and does it sound like they made real decisions and produced real results?
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The Sections Your Portfolio Needs — In This Order</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">1. Hero — who you are and what you do (10 seconds)</h3>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Your name, your role — specific: &ldquo;Full-Stack Developer specialising in React and Node.js,&rdquo; not &ldquo;Software Engineer&rdquo; — and one sentence of context. Optional but recommended: a headshot. It adds trust, especially for remote applications where the hiring team has never met you.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">2. Projects — the most important section</h3>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Two to four projects is ideal. More than five and the portfolio starts to feel like a dump rather than a showcase.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          For each project, you need: project name and what it does (one sentence, plain English), the outcome (what changed because this project exists), your specific role (built it solo? led a team?), tech stack, and links — live demo if available, GitHub repo, or both.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          This is where most developer portfolios fail. &ldquo;E-commerce platform&rdquo; tells a recruiter almost nothing. &ldquo;E-commerce platform handling 200 orders per day, built with Next.js and Stripe, reducing checkout abandonment by 23%&rdquo; tells them everything.
        </p>

        <Callout emoji="💡" title="If you do not have measurable outcomes" color="blue">
          Describe the problem solved: &ldquo;Built a CLI tool to automate local dev environment setup — reduced new developer onboarding from 4 hours to 20 minutes.&rdquo; A problem clearly stated and solved is more compelling than a vague outcome.
        </Callout>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">3. Skills — brief and honest</h3>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Technologies you are genuinely comfortable with. Not a wish list. Not everything you have touched once. Group them by type: Languages, Frameworks, Tools, Databases. Do not use percentage bars — there is no standard for what 80% proficiency in JavaScript means, and experienced engineers know this.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">4. About — two or three sentences</h3>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          What you do, what you are looking for, and any relevant context — location, timezone if remote, availability. This is not your CV summary. It is a human sentence.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">5. Contact — an email they can click</h3>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Links to LinkedIn and GitHub. Optionally a contact form, but an email address is less friction. Your email should be visible without scrolling on desktop.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The Mistakes That Make Good Developers Look Unprepared</h2>

        <Checklist items={[
          'Showing only one project — suggests you have not built much or do not know what to select. Minimum: two.',
          'No live links — a repository link is evidence you wrote code. A live link is evidence the code works.',
          'Padding the skills list — listing technologies you are not confident in is detectable in a technical interview.',
          'No contact information — there are developer portfolios with no way to get in touch. This is not mysterious, it is a missed application.',
          'Projects listed without any description of what they do or why they were built.',
        ]} />

        <PullQuote>
          The recruiter is not trying to find a reason to hire you. They are looking for a reason not to. Do not give them one.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Start From a Finished Draft</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          An <a href="/portfolio-builder" className="text-[#0A66C2] underline underline-offset-2">AI portfolio builder</a> generates this exact structure from your CV — hero, projects with outcomes, skills, contact — so you start from a finished first draft rather than a blank page. You can always refine it, but starting from done beats starting from empty every time.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently Asked Questions</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>How many projects should a developer portfolio have?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Two to four is the right range. Two shows you have built real things. Four shows breadth. More than six starts to feel unfocused. Quality over volume — a detailed description of two strong projects beats a list of ten undescribed ones.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Should I include academic projects?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Yes, especially if you are early-career or transitioning. Academic projects show you can solve structured problems. Just describe them with the same outcome-focused language as professional projects — what problem did it solve, what did you learn, what would you do differently?
        </p>

        <KeyTakeaway>
          A portfolio for web developers works when it answers the right questions in the right order: who you are, what you have built and what resulted, what you can do, and how to reach you. The structure is not complicated. The mistake is skipping any part of it.
        </KeyTakeaway>

        <CTASection
          headline="Build your developer portfolio in 5 minutes"
          sub="Fill in your projects and we generate the copy. No design work, no blank page."
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
          { title: 'How to Create a Developer Portfolio That Gets You Hired', slug: 'how-to-create-a-developer-portfolio', time: '6 min' },
          { title: 'Is GitHub a Portfolio Website? What Recruiters Actually See', slug: 'is-github-a-portfolio-website', time: '5 min' },
        ]} />
      </article>
    </>
  )
}
