import type { Metadata } from 'next'
import { PullQuote, Callout, Checklist, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: 'Portfolio Tips for African Tech Professionals — liveportfolio.site',
  description: 'How to stand out to global recruiters as an African tech professional. Frame your projects with outcomes, signal remote readiness, and build a portfolio that travels.',
  openGraph: {
    title: 'Portfolio Tips for African Tech Professionals',
    description: 'How to present your work to global recruiters, frame outcomes with numbers, and signal that you are ready for remote roles.',
    url: 'https://liveportfolio.site/blog/portfolio-tips-for-african-tech-professionals',
    siteName: 'liveportfolio.site',
    type: 'article',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/portfolio-tips-for-african-tech-professionals',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Portfolio Tips for African Tech Professionals',
  description: 'How to present your work to global recruiters and build a portfolio that gets responses.',
  author: { '@type': 'Organization', name: 'liveportfolio.site' },
  publisher: { '@type': 'Organization', name: 'liveportfolio.site', url: 'https://liveportfolio.site' },
  datePublished: '2026-05-31',
  url: 'https://liveportfolio.site/blog/portfolio-tips-for-african-tech-professionals',
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
          <span className="inline-block text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-4 bg-white px-3 py-1 rounded-full">
            Career tips
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            Portfolio Tips for African Tech Professionals
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Your work is competitive with anyone in the world. Here is how to make sure your portfolio communicates that to a recruiter who has never met you.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          The gap between a great developer and a hired developer is often just communication. You can build excellent products but still lose out if your portfolio does not tell the story clearly.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          These tips are specifically for African tech professionals presenting their work to global recruiters and international companies.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Frame Every Project With Numbers</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The biggest difference between an average portfolio and a standout one is specificity. Vague descriptions get ignored. Numbers get attention.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Compare these two descriptions of the same project. "Built a data dashboard for a bank." versus "Built a customer analytics dashboard that reduced manual reporting time from 4 hours to 15 minutes for a team of 20 analysts." The second one gets a response.
        </p>

        <PullQuote>
          Numbers make your outcomes real. They turn "I built a thing" into "I solved a problem with measurable results."
        </PullQuote>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          You do not need huge numbers. Even small ones work. "Used by 40 students." "Processed 500 transactions daily." "Reduced load time by 60%." These are real and believable. That is exactly what makes them effective.
        </p>

        <Callout emoji="💡" title="If you do not have numbers, estimate" color="blue">
          Did your project save someone time? Estimate how much. Did it have users? Approximate the count. Honest estimates with context are fine. "Approximately 200 users" is better than no number at all.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Signal That You Are Open to Remote Work</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Remote recruiters filter by remote-readiness before they filter by skill. Your portfolio should make it obvious within the first few seconds that you are available for remote work and have experience working asynchronously.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Put your location in your profile. "Lagos, Nigeria. Open to remote roles." This builds trust. It tells the recruiter you are not hiding where you are, and it signals that you have thought about the practical realities of remote work.
        </p>

        <Checklist items={[
          'State your location clearly in your hero section',
          'Add "Open to remote work" or "Available for remote roles" explicitly',
          'If you have worked remotely before, mention it in your about section',
          'Include your GitHub and LinkedIn so recruiters can verify your activity',
          'Mention communication tools you use: Slack, Notion, GitHub, Figma',
        ]} />

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What to Leave Off Your Portfolio</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Less is more. A focused portfolio is stronger than a complete one.
        </p>

        <Checklist items={[
          'Student assignments that nobody would use in real life',
          'Tutorials you followed without adding your own twist',
          'Outdated projects built with technologies you no longer use',
          'Certificates and courses (these belong on LinkedIn, not your portfolio)',
          'Generic bio language: "passionate," "hard-working," "team player"',
          'Half-finished projects with no outcome or live link',
        ]} />

        <PullQuote>
          Two projects you are proud of will always beat eight projects you are not. Your portfolio is not a complete list of everything you have done.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Mobile-First, Because Recruiters Check on Phones</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          A significant portion of portfolio visits happen on mobile devices. Recruiters are busy. They check links on their phones while commuting, between meetings, and in the evening.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If your portfolio does not look good on a phone screen, you lose those impressions entirely. Text that is too small, images that overflow the screen, or buttons that do not work on touch are all reasons to close the tab.
        </p>

        <Callout emoji="📱" title="Test on a real phone before you share" color="blue">
          Open your portfolio on your actual phone. Is the text readable without zooming? Can you tap every link? Does the layout look intentional, not broken? If the answer to any of these is no, fix it before you send the link anywhere.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Writing for a Global Recruiter Who Does Not Know Your Context</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          When you describe a project to someone in your city, you can assume shared context. A recruiter in Germany does not know what NIBSS is, what the Nigerian stock exchange is, or what a borehole management system solves.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Explain your projects for someone who knows nothing about Nigeria. Describe the problem in plain, universal language. Then explain what you built and what it achieved.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          This is not dumbing down. It is good writing. Clarity is a professional skill.
        </p>

        <KeyTakeaway>
          African tech professionals win global remote roles by doing three things well: showing outcomes with numbers, signaling remote readiness explicitly, and writing project descriptions that any international recruiter can understand. Your skills are world-class. Make sure your portfolio says so.
        </KeyTakeaway>

        <CTASection
          headline="Build a portfolio that travels"
          sub="Your work deserves to be seen. Create your portfolio in 5 minutes and start sending it."
        />

        <RelatedArticles articles={[
          { title: 'How to Get a Remote Tech Job From Nigeria in 2026', slug: 'how-to-get-a-remote-tech-job-from-nigeria', time: '7 min' },
          { title: 'What Recruiters Actually Look For in a Portfolio', slug: 'what-recruiters-look-for-in-a-portfolio', time: '5 min' },
        ]} />
      </article>
    </>
  )
}
