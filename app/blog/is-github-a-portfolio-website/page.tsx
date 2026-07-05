import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'Is GitHub a Portfolio Website? What Recruiters Actually See | LivePortfolio',
  description: "Your GitHub profile shows your code. It does not tell a non-technical recruiter why any of it matters. Here's the real gap between a GitHub profile and a portfolio.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'Is GitHub a Portfolio Website? What Recruiters Actually See',
    description: "Your GitHub profile shows your code. It does not tell a non-technical recruiter why any of it matters.",
    url: 'https://liveportfolio.site/blog/is-github-a-portfolio-website',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-14T00:00:00Z',
    modifiedTime: '2026-07-14T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/is-github-a-portfolio-website',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'Is GitHub a Portfolio Website?', item: 'https://liveportfolio.site/blog/is-github-a-portfolio-website' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Is GitHub a Portfolio Website? What Recruiters Actually See',
  description: 'Your GitHub profile shows your code. The gap between that and a portfolio is what this article explains.',
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-14T00:00:00Z',
  dateModified: '2026-07-14T00:00:00Z',
  url: 'https://liveportfolio.site/blog/is-github-a-portfolio-website',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/is-github-a-portfolio-website' },
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
            Is GitHub a Portfolio Website? What Recruiters Actually See
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            GitHub shows your code. A portfolio explains why it matters. Here is the difference — and when you need both.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Whether GitHub is a portfolio website depends entirely on who is doing the evaluating — and most hiring funnels include at least one person who cannot read code.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          For a technical hiring manager, GitHub is powerful evidence. For a recruiter or HR professional doing the first filter, it is a list of repository names they cannot evaluate. Understanding this split is how you decide what to build.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What GitHub Shows</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          GitHub is a code repository hosting platform. It shows: your repositories and their names, your commit frequency (the green contribution graph), the languages you have used, and your README files if you have written them.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          For a technical hiring manager who writes code themselves, this is genuinely useful. They can clone a repo, look at your code quality, read your commit messages, and form a real opinion.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What GitHub Does Not Show</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Here is the problem: not every person in a hiring process is that technical hiring manager.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          In many hiring funnels — especially for remote roles — a recruiter or HR professional is the first filter. They are looking for: what does this person do, what have they built, what outcomes did it create? GitHub gives them none of this in a readable way.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          A repository named <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">rest-api-user-auth</code> tells a recruiter almost nothing. A portfolio entry that says &ldquo;Built a secure user authentication system used by 2,000 registered users, reducing onboarding time by 60%&rdquo; tells them everything.
        </p>

        <PullQuote>
          GitHub is raw material. A portfolio is the translation.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">When GitHub Alone Is Genuinely Enough</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If you are applying through technical channels — direct outreach to a CTO, contributing to open source, or applying for a role where the posting explicitly asks for a GitHub profile — GitHub works because the person evaluating you speaks the same language.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          GitHub also matters because technical interviewers will look at it even if you have a portfolio. Think of GitHub as your backend and your portfolio as your front door.
        </p>

        <Callout emoji="💡" title="The right setup: both, together" color="blue">
          Keep GitHub active as proof that you write real code. Link it from your portfolio. Let your portfolio explain why that code matters — to anyone, regardless of their technical background.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What a Portfolio Adds on Top of GitHub</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          An <a href="/portfolio-builder" className="text-[#0A66C2] underline underline-offset-2">AI portfolio builder</a> translates your technical work into outcomes that any reader can evaluate in 30 seconds — without requiring design skills or a blank page. You keep GitHub active as proof that you write real code. The portfolio explains why that code matters.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          The combination is more powerful than either alone: GitHub for technical credibility, portfolio for human-readable narrative.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently Asked Questions</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Should I link my GitHub from my portfolio?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Yes — always. A portfolio is the human-readable front door; GitHub is the technical proof behind it. Link them to each other.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Is a GitHub README a substitute for a portfolio?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          A well-written README is better than nothing, and for open-source projects it is essential. But a README is project-specific. A portfolio tells the full story across all your work, with your professional narrative and contact information, at one URL.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Do non-technical companies check GitHub?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Some do, some do not. Assume they might — which means keeping your public repositories clean and professional. But also assume many will not be able to evaluate what they see, which is why a portfolio that requires no technical literacy to understand is worth having.
        </p>

        <KeyTakeaway>
          GitHub shows your code to people who can read it. A portfolio explains your work to everyone else — which includes most of the people making hiring decisions. Use GitHub as proof; use your portfolio as your front door.
        </KeyTakeaway>

        <CTASection
          headline="Turn your GitHub work into a portfolio anyone can read"
          sub="Paste your experience and we will write clear, outcome-focused project descriptions in minutes."
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
          { title: 'Portfolio for Bootcamp Graduates: How to Get Hired With Little Experience', slug: 'portfolio-for-bootcamp-graduates', time: '6 min' },
        ]} />
      </article>
    </>
  )
}
