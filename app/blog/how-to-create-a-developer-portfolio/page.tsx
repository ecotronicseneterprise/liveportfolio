import type { Metadata } from 'next'
import { PullQuote, Callout, StepCard, Checklist, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'How to Create a Developer Portfolio That Gets You Hired — liveportfolio.site',
  description: 'Learn exactly what to include in a developer portfolio, the 6 sections that matter, and the common mistakes that get candidates skipped.',
  authors: [{ name: 'LivePortfolio Team' }],
  openGraph: {
    title: 'How to Create a Developer Portfolio That Gets You Hired',
    description: 'The 6 sections every portfolio needs, the mistakes that get you skipped, and how to build one fast.',
    url: 'https://liveportfolio.site/blog/how-to-create-a-developer-portfolio',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-05-01T00:00:00Z',
    authors: ['https://liveportfolio.site'],
    images: [{
      url: 'https://liveportfolio.site/logo-1024.png',
      width: 1024,
      height: 1024,
      alt: 'How to Create a Developer Portfolio That Gets You Hired',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://liveportfolio.site/logo-1024.png'],
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/how-to-create-a-developer-portfolio',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Create a Developer Portfolio That Gets You Hired',
  description: 'The 6 sections every portfolio needs, the mistakes that get you skipped, and how to build one fast.',
  author: { '@type': 'Organization', name: 'liveportfolio.site' },
  publisher: { '@type': 'Organization', name: 'liveportfolio.site', url: 'https://liveportfolio.site' },
  datePublished: '2026-05-31',
  url: 'https://liveportfolio.site/blog/how-to-create-a-developer-portfolio',
}

export default function Article() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#E8F0F9] px-5 py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div style={{ marginBottom: 16 }}>
            <a href="/blog" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Blog</a>
          </div>
          <span className="inline-block text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-4 bg-white px-3 py-1 rounded-full">
            Portfolio basics
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            How to Create a Developer Portfolio That Gets You Hired
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            You have been building things for months. But if no one can see your work, it is like it never happened.
          </p>
          <p className="text-xs text-gray-400">6 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          A developer portfolio is the single most effective tool you have for getting hired. Not your degree. Not your CV. Your portfolio.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Recruiters spend an average of 7 seconds deciding whether to keep reading. A portfolio that shows your work clearly and quickly is the difference between a callback and silence.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Here is exactly what to include, what to skip, and how to build one today.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Why Your Portfolio Matters More Than Your CV</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A CV tells someone what you claim to have done. A portfolio shows them the actual thing you built.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          For remote hiring, this gap is even bigger. A recruiter in Canada or Germany has no way to verify your experience from a piece of paper. But they can click a live link, read your case studies, and see your GitHub commits.
        </p>

        <PullQuote>
          A CV tells someone what you did. A portfolio shows them how you think.
        </PullQuote>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Your portfolio removes the guesswork. That is why even senior engineers with 10 years of experience benefit from having one.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-6">The 6 Sections Every Developer Portfolio Needs</h2>

        <StepCard number={1} title="Your name and role">
          The first thing a recruiter sees should be your name and what you do. Not a tagline. Not a quote. Just your name and your title: "Amara Osei. Frontend Developer." Clear and immediate.
        </StepCard>

        <StepCard number={2} title="A strong headline">
          Your headline is one sentence that tells a recruiter what you bring. Skip generic phrases like "passionate developer." Try something specific: "I build fast, accessible React apps for fintech and e-commerce teams." This takes 10 seconds to write and makes a real impression.
        </StepCard>

        <StepCard number={3} title="2 to 3 projects with outcomes">
          Projects are the heart of your portfolio. Each one should answer three questions: what was the problem, what did you build, and what happened as a result. Numbers are important here. "Reduced page load time by 60%" is better than "improved performance." If your project has real users, say so.
        </StepCard>

        <StepCard number={4} title="Your skills">
          List your technical skills clearly. Group them if you have many. Recruiters scan this section fast. Keep it honest and current.
        </StepCard>

        <StepCard number={5} title="A short about section">
          Two paragraphs is enough. Where you are based, how long you have been building, and what kind of work you are looking for. Human and direct. You do not need to mention every course you have taken.
        </StepCard>

        <StepCard number={6} title="Clear contact information">
          Your email should be visible without scrolling. GitHub and LinkedIn links are important. If you are open to remote work, say it here. Do not make a recruiter hunt for how to reach you.
        </StepCard>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The Mistakes That Get You Skipped</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Most portfolios fail in the same ways. Here are the things to avoid.
        </p>

        <Callout emoji="⚠️" title="Common portfolio mistakes" color="amber">
          These are the things that make recruiters close the tab.
        </Callout>

        <Checklist items={[
          'Listing projects with no description of what they do or why you built them',
          'Writing "I worked on X" instead of "I built X" — own your work',
          'No live links or GitHub links to verify the project',
          'A wall of text with no structure or subheadings',
          'Broken links, missing images, or pages that do not load on mobile',
          'Claiming skills you cannot demonstrate anywhere in your projects',
          'No contact information visible above the fold',
        ]} />

        <PullQuote>
          The recruiter is not trying to find a reason to hire you. They are looking for a reason not to. Do not give them one.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">How Long Should Building Your Portfolio Take?</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If you are building from scratch with a template, three to four hours of focused work is enough for a strong first version.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The biggest time sink is usually writing about your projects. Most developers undersell their work because they focus on what they built instead of the problem it solved. Use this formula for every project: problem, solution, outcome.
        </p>

        <Callout emoji="💡" title="The fastest way to finish" color="blue">
          Do not aim for perfect. Aim for done. A live portfolio with two solid projects gets more callbacks than a perfect portfolio that is still in a draft folder. You can always improve it later.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What to Include in Each Project</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          For every project you include, write three things. What problem existed before you built this. What you did to solve it. What changed as a result.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If your project has a live URL, include it. If it is on GitHub, include the link. A screenshot or demo video goes a long way.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Two or three strong, well-described projects beats ten half-finished ones with no context.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Do You Need a Custom Domain?</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          No. A clean URL like liveportfolio.site/yourname is professional and memorable. What matters is that your portfolio loads fast, looks good on mobile, and has no broken elements.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Recruiters do not care about your domain name. They care about what is on the page.
        </p>

        <KeyTakeaway>
          A developer portfolio is your proof of work. Include 2 to 3 projects with clear problem, solution, and outcome. Keep your contact info visible. Make it load fast on mobile. A done portfolio is infinitely better than a perfect one that nobody sees.
        </KeyTakeaway>

        <CTASection
          headline="Build your portfolio in 5 minutes"
          sub="Fill in your information and we will write the copy for you. No writing skills needed."
        />

        <RelatedArticles articles={[
          { title: 'What Recruiters Actually Look For in a Portfolio', slug: 'what-recruiters-look-for-in-a-portfolio', time: '5 min' },
          { title: 'How Bootcamp Graduates Can Build a Portfolio With Little Experience', slug: 'portfolio-for-bootcamp-graduates', time: '6 min' },
        ]} />
      </article>
    </>
  )
}
