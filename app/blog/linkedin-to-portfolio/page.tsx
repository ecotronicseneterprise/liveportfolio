import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: "LinkedIn to Portfolio: Turn Your Profile Into a Website Recruiters Remember | LivePortfolio",
  description: "Your LinkedIn is not a portfolio — it is a discovery tool. Here's how to turn the same experience into a portfolio website that makes a stronger impression.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: 'LinkedIn to Portfolio: Turn Your Profile Into a Website Recruiters Remember',
    description: "Your LinkedIn is not a portfolio — it is a discovery tool. Here's how to go further.",
    url: 'https://liveportfolio.site/blog/linkedin-to-portfolio',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-18T00:00:00Z',
    modifiedTime: '2026-07-18T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/linkedin-to-portfolio',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'LinkedIn to Portfolio Website', item: 'https://liveportfolio.site/blog/linkedin-to-portfolio' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: "LinkedIn to Portfolio: Why Your Profile Alone Isn't Enough Anymore",
  description: "Your LinkedIn is not a portfolio — it is a discovery tool. Here's how to go further.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-18T00:00:00Z',
  dateModified: '2026-07-18T00:00:00Z',
  url: 'https://liveportfolio.site/blog/linkedin-to-portfolio',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/linkedin-to-portfolio' },
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
            LinkedIn to Portfolio: Why Your Profile Alone Isn&apos;t Enough Anymore
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            LinkedIn gets you found. A portfolio makes you memorable. Here is how to connect the two.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Understanding why LinkedIn to portfolio is the right move starts with understanding what LinkedIn actually does well — and where it stops.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          LinkedIn and a portfolio serve different purposes in the same hiring journey. The mistake is assuming one replaces the other.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What LinkedIn Is Good At</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          LinkedIn&apos;s strength is distribution. Your profile gets surfaced in recruiter searches, algorithm feeds, and mutual-connection visibility. Someone looking for a data scientist in Lagos can find you without having ever heard of you. That reach is powerful and worth investing in.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          LinkedIn is also where professional credibility is established in a shared context — your connections, endorsements, recommendations, and activity are all visible and add social proof that a portfolio cannot replicate.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Where LinkedIn Falls Short</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Once someone is interested in you specifically — they have found you, read your profile, decided you are worth a closer look — LinkedIn becomes a constraint.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Looking at someone&apos;s LinkedIn profile in depth means scrolling through a standardised layout, reading job entries formatted the same way as everyone else&apos;s, and hoping the person included enough detail to understand what they did and how they think.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Your portfolio can do what LinkedIn cannot: present your work as narrative case studies, show you without competing for attention within LinkedIn&apos;s interface, be visually differentiated, and tell you when someone is looking at it.
        </p>

        <PullQuote>
          LinkedIn is where you get found. Your portfolio is what you show people once they find you.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The LinkedIn and Portfolio Combination</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The right setup is both, working together. Every LinkedIn profile should have a portfolio URL in the Featured section and in the Website field. When a recruiter visits your profile, the portfolio link is what takes them from &ldquo;this person looks interesting&rdquo; to &ldquo;I should reach out.&rdquo;
        </p>

        <Callout emoji="💡" title="Where to put your portfolio URL on LinkedIn" color="blue">
          Add it in three places: (1) the Featured section at the top of your profile — most visible, (2) the Contact Info Website field, and (3) your About section as a plain link. Each placement catches a different type of visitor at a different point in their profile scroll.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">The Translation From LinkedIn to Portfolio</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Your LinkedIn profile already contains most of what a portfolio needs — your experience, projects, skills, and professional story. The work is translation, from LinkedIn&apos;s standardised format into a portfolio that shows your thinking, not just your timeline.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          A <a href="/cv-to-portfolio" className="text-[#0A66C2] underline underline-offset-2">CV to portfolio website</a> does this translation automatically. Upload your CV (which covers the same ground as your LinkedIn profile), and AI writes portfolio-ready copy in minutes.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently Asked Questions</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Should I link my portfolio on LinkedIn?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Yes — always. Add it in the Featured section at the top of your profile and in the Contact Info Website field. Make it the first thing a recruiter who visits your profile can click.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Does having a portfolio help with LinkedIn recruiter searches?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Not directly — LinkedIn&apos;s internal search only ranks LinkedIn content. But when a recruiter finds you on LinkedIn and clicks through to your portfolio, that is where the deeper impression is made. The two tools complement each other.
        </p>

        <KeyTakeaway>
          LinkedIn brings recruiters to your profile. Your portfolio is what turns a profile visit into a conversation. The two work together — not as alternatives. Link your portfolio everywhere on LinkedIn, and watch how much more often recruiters reach out.
        </KeyTakeaway>

        <CTASection
          headline="Build the portfolio your LinkedIn profile should link to"
          sub="Professional, AI-written, live in minutes. Free to build and preview."
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
          { title: 'What Recruiters Actually Value in a Portfolio', slug: 'what-recruiters-look-for-in-a-portfolio', time: '5 min' },
        ]} />
      </article>
    </>
  )
}
