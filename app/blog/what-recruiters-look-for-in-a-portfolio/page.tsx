import type { Metadata } from 'next'
import { PullQuote, Callout, StepCard, Checklist, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'What Recruiters Actually Value in a Portfolio — liveportfolio.site',
  description: 'A recruiter has 7 seconds before they decide. Here is exactly what they are scanning for, and the red flags that get candidates skipped immediately.',
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'What Recruiters Actually Value in a Portfolio',
    description: 'The 7-second scan, projects with outcomes, and the red flags that get candidates skipped.',
    url: 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-05-22T00:00:00Z',
    modifiedTime: '2026-07-04T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'What Recruiters Actually Value in a Portfolio', item: 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'What Recruiters Actually Value in a Portfolio',
  description: 'The 7-second scan, what makes a portfolio stand out, and the red flags that end applications immediately.',
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-05-22T00:00:00Z',
  dateModified: '2026-07-04T00:00:00Z',
  url: 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio' },
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
            Recruiter insight
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            What Recruiters Actually Value in a Portfolio
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            A recruiter looks at your portfolio for about 7 seconds before deciding whether to keep reading. Here is what they value in those 7 seconds.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Understanding what recruiters value in portfolios gives you an edge before a single application is sent. They are not trying to be unfair — they are busy, with dozens of profiles to review and a job to fill. Your portfolio needs to answer the most important question immediately: can this person do the work?
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Knowing what they value helps you put the right things in the right places.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The 7-Second Scan</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          When a recruiter opens your portfolio, they are not reading. They are scanning. In those first few seconds they are answering one question: does this person clearly do the thing I am hiring for?
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If your name and job title are visible immediately, and at least one project is shown within the first scroll, you pass the scan. If there is a splash screen, a loading animation, or three paragraphs of introduction before any actual work appears, you lose them.
        </p>

        <PullQuote>
          Your portfolio does not need to be beautiful. It needs to be clear. Clarity wins every time.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">What Recruiters Are Actually Reading</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          After the initial scan, if they are still reading, here is what they focus on.
        </p>

        <StepCard number={1} title="Your project descriptions">
          This is the most important section of your portfolio. Recruiters want to understand three things about every project: what problem existed, what you built to solve it, and what happened as a result. A project described as "e-commerce website" tells them nothing. A project described as "built a checkout flow for an online fashion brand that processed 1,200 orders in its first month" tells them everything they need.
        </StepCard>

        <StepCard number={2} title="Evidence of the stack you claim">
          If your CV says you know React, your portfolio should show at least one React project. Recruiters check that your claimed skills appear in your actual work. A mismatch here is a red flag that creates doubt across your entire application.
        </StepCard>

        <StepCard number={3} title="Live links and GitHub">
          A portfolio with no live links or no GitHub activity is difficult to trust. You do not need a polished live product for every project. Even a GitHub link to well-commented code tells a recruiter something meaningful about your professionalism.
        </StepCard>

        <StepCard number={4} title="Contact information">
          Your email should be visible on the first scroll. Recruiters who are interested will not go searching for a way to reach you. If they have to look, some of them will not bother.
        </StepCard>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Proof Over Claims</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          There is a phrase that applies perfectly to portfolios: "show, do not tell." Every claim you make in your portfolio should be supported by evidence somewhere on the page.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Saying "I am an experienced React developer" is a claim. Showing three React projects with outcomes and live links is proof. Recruiters are trained to be skeptical of unsubstantiated claims. Give them the evidence and the work speaks for itself. A <a href="/cv-to-portfolio" className="text-[#0A66C2] underline underline-offset-2">CV to portfolio website</a> solves this automatically — your raw experience becomes proof the moment it is presented as projects with clear outcomes.
        </p>

        <Callout emoji="⚠️" title="The most common mistake" color="amber">
          Writing a skills list that is not reflected anywhere in your projects. If you list "Machine Learning" but none of your projects involve ML, a recruiter will notice. Only claim skills you can point to in your actual work.
        </Callout>

        <PullQuote>
          Recruiters are not reading your portfolio to admire it. They are looking for evidence that you can do the job.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Red Flags That End Applications Immediately</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          These are the things that cause recruiters to close the tab without reaching out.
        </p>

        <Checklist items={[
          'No projects at all, only a skills list and education',
          'Broken links to projects or GitHub repositories',
          'Portfolio that does not load or load slowly on mobile',
          'Projects with no description beyond the title',
          'A last update date of 2 or more years ago with nothing new',
          'No visible contact information',
          'Long paragraphs with no formatting that are hard to scan',
          'Claiming senior-level skills with no projects to match',
        ]} />

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What Makes a Portfolio Stand Out</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A standout portfolio is not the most designed or the most complex. It is the clearest.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The portfolios that get the most callbacks have a handful of things in common. They show real outcomes. They are easy to navigate. They have at least one project that is clearly impressive. And they make it effortless for a recruiter to reach out.
        </p>

        <Checklist items={[
          'Clear name and role visible immediately on page load',
          '2 to 3 projects with problem, solution, and outcome',
          'At least one project with a live link or demo',
          'Skills that match the projects shown',
          'GitHub activity visible (even a few commits per week)',
          'Email address visible without scrolling on desktop and mobile',
          'Professional, clean design that does not distract from the content',
        ]} />

        <Callout emoji="💡" title="One great project is enough to start" color="blue">
          You do not need ten projects to have a strong portfolio. One project described with clarity, backed by a live link, and showing a real outcome is enough to start getting responses. Build it well, then add more over time.
        </Callout>

        <KeyTakeaway>
          Recruiters scan fast and read slow. Make your name, role, and at least one impressive project visible immediately. Describe every project with a problem, solution, and outcome. Include live links and your contact information. Proof beats claims every time.
        </KeyTakeaway>

        <CTASection
          headline="Build a portfolio that passes the scan"
          sub="Your projects described clearly and professionally, live in 5 minutes."
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
          { title: 'Portfolio Tips for African Tech Professionals', slug: 'portfolio-tips-for-african-tech-professionals', time: '5 min' },
        ]} />
      </article>
    </>
  )
}
