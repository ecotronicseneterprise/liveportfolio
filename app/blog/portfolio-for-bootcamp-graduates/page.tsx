import type { Metadata } from 'next'
import { PullQuote, Callout, StepCard, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'Bootcamp Graduate Portfolio Guide — LivePortfolio',
  description: 'You have more to show than you think. A guide for ALX, Andela, and bootcamp graduates on turning coursework into a portfolio that gets callbacks.',
  authors: [{ name: 'LivePortfolio Team' }],
  openGraph: {
    title: 'How Bootcamp Graduates Can Build a Portfolio With Little Experience',
    description: 'How to turn coursework and side projects into a portfolio that gets responses, even when you are just starting out.',
    url: 'https://liveportfolio.site/blog/portfolio-for-bootcamp-graduates',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-05-29T00:00:00Z',
    authors: ['https://liveportfolio.site'],
    images: [{
      url: 'https://liveportfolio.site/logo-1024.png',
      width: 1024,
      height: 1024,
      alt: 'How Bootcamp Graduates Can Build a Portfolio With Little Experience',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://liveportfolio.site/logo-1024.png'],
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/portfolio-for-bootcamp-graduates',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Bootcamp Graduates Can Build a Portfolio With Little Experience',
  description: 'Turning coursework into a portfolio that gets responses, even when you are just starting out.',
  author: { '@type': 'Organization', name: 'liveportfolio.site' },
  publisher: { '@type': 'Organization', name: 'liveportfolio.site', url: 'https://liveportfolio.site' },
  datePublished: '2026-05-31',
  url: 'https://liveportfolio.site/blog/portfolio-for-bootcamp-graduates',
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
            For beginners
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            How Bootcamp Graduates Can Build a Portfolio With Little Experience
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            The hardest part of a first portfolio is believing you have something worth showing. You do. Here is how to find it and present it well.
          </p>
          <p className="text-xs text-gray-400">6 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          You just finished your bootcamp. You have been coding for months. You know React, or Python, or SQL. But when you sit down to build a portfolio, you freeze.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          "I do not have enough experience." "All my projects are just tutorials." "Nobody will take me seriously."
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          None of those things are true. And this article will show you why.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">You Have More Than You Think</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Bootcamp graduates consistently underestimate what they have built. You spent months solving real problems, learning new technologies, and shipping projects that actually work.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          That is more than most people have done. The issue is not what you have built. The issue is how you describe it.
        </p>

        <Callout emoji="💡" title="A reminder" color="green">
          Every senior engineer in the world started with zero professional experience. The difference between a junior who gets hired and one who does not is usually not skill. It is how they present what they have already done.
        </Callout>

        <PullQuote>
          You do not need years of experience. You need one good project described with clarity.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Turning Coursework Into Portfolio Projects</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The key to making a bootcamp project portfolio-worthy is framing. You need to describe it the way a working professional would, not the way a student would.
        </p>

        <StepCard number={1} title="Start with the problem, not the technology">
          Do not start your project description with "I used React to build..." Start with the problem: "Students in my bootcamp had no simple way to track their progress across 12 modules." Then explain what you built. This approach immediately shows that you think like a developer who solves problems, not just someone completing assignments.
        </StepCard>

        <StepCard number={2} title="Add what you learned to your outcome">
          For bootcamp projects, it is fine to include what you learned as part of the outcome. "This project taught me how to manage complex state across multiple components and how to structure a REST API cleanly." This shows self-awareness and the ability to grow, which hiring managers value in junior developers.
        </StepCard>

        <StepCard number={3} title="Deploy it">
          A deployed project is three times more credible than one that only exists on your laptop. Free deployments on Vercel, Netlify, or Railway take about ten minutes. If your project is live and clickable, a recruiter can verify it. If it only exists as a GitHub repo, many of them will not bother cloning it to check.
        </StepCard>

        <StepCard number={4} title="Put it on GitHub with a good README">
          Your GitHub repo should have a README that explains what the project does, why you built it, and how to run it. A clean README shows professionalism. It also makes it easier for a recruiter who finds your GitHub to understand your work without needing to read code.
        </StepCard>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The One-Project-Done-Well Rule</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Many bootcamp graduates try to show everything they have ever built. This approach works against you.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Five half-finished projects with no descriptions tell a recruiter that you start things but do not finish them. One complete, well-described project with a live link tells them you ship.
        </p>

        <PullQuote>
          The portfolio that gets you hired is not the longest one. It is the most honest and complete one.
        </PullQuote>

        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Pick your best project. Make it great. Add a clear description, a live link, a GitHub link, and an outcome statement. Then add a second project if you have one strong enough. Start there.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">How to Write About Projects When You Are New</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Use this structure for every project. It works at every experience level.
        </p>

        <Callout emoji="📝" title="The project description formula" color="blue">
          <strong>Problem:</strong> What did not exist or was not working before you built this?<br />
          <strong>What I built:</strong> Describe what you created in plain language.<br />
          <strong>Outcome:</strong> What changed? Who used it? What did you learn?<br /><br />
          You do not need a business outcome. "Used by 30 classmates during the bootcamp" is a real outcome. "Helped me understand database design at a deeper level" is a real outcome.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Confidence Framing: Own Your Work</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The language you use to describe your work signals how you feel about it. If you sound apologetic, the recruiter will pick up on that.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Do not write "I was assigned to build a login system." Write "I built a secure authentication system with JWT tokens and email verification." You did the work. Own it.
        </p>

        <Callout emoji="⚠️" title="Words to avoid in your portfolio" color="amber">
          Avoid: "assisted with," "helped to build," "was part of a team that," "tried to," "attempted to." These phrases reduce your credibility. If you contributed to something, describe your contribution directly. If you built it, say you built it.
        </Callout>

        <PullQuote>
          You did the work. Write as if you know it.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What to Do if You Really Have Nothing Yet</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If you genuinely finished your bootcamp without a single project you are proud of, build one this week. You do not need permission.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Find a problem in your daily life that technology could solve. Build a simple version of the solution. Write about it clearly. Deploy it. That is a portfolio project.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          One real project with a clear description beats zero projects every single time.
        </p>

        <KeyTakeaway>
          Bootcamp graduates get hired every day with small portfolios. The trick is not the number of projects. It is the quality of the description, the honesty of the outcomes, and the confidence of the framing. You built real things. Present them like a professional and a recruiter will read them like one.
        </KeyTakeaway>

        <CTASection
          headline="Turn your bootcamp projects into a professional portfolio"
          sub="Fill in your projects, and we will write clear, professional descriptions for you."
        />

        <RelatedArticles articles={[
          { title: 'How to Create a Developer Portfolio That Gets You Hired', slug: 'how-to-create-a-developer-portfolio', time: '6 min' },
          { title: 'How to Get a Remote Tech Job From Nigeria in 2026', slug: 'how-to-get-a-remote-tech-job-from-nigeria', time: '7 min' },
        ]} />
      </article>
    </>
  )
}
