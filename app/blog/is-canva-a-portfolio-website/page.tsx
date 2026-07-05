import type { Metadata } from 'next'
import { PullQuote, Callout, KeyTakeaway, CTASection, RelatedArticles } from '../BlogComponents'

export const metadata: Metadata = {
  title: "Is Canva a Portfolio Website? Here's What It's Missing | LivePortfolio",
  description: "Canva makes beautiful documents. But a portfolio website it is not. Here's exactly what Canva can and cannot do for your career — and the one gap that costs you interviews.",
  authors: [{ name: 'Clifford Nwanna', url: 'mailto:nwannachumaclifford@gmail.com' }],
  openGraph: {
    title: "Is Canva a Portfolio Website? Here's What It's Missing",
    description: "Canva makes beautiful documents. But a portfolio website it is not. Here's the one gap that costs you interviews.",
    url: 'https://liveportfolio.site/blog/is-canva-a-portfolio-website',
    siteName: 'liveportfolio.site',
    type: 'article',
    publishedTime: '2026-07-14T00:00:00Z',
    modifiedTime: '2026-07-14T00:00:00Z',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog/is-canva-a-portfolio-website',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://liveportfolio.site/blog' },
    { '@type': 'ListItem', position: 3, name: 'Is Canva a Portfolio Website?', item: 'https://liveportfolio.site/blog/is-canva-a-portfolio-website' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: "Is Canva a Portfolio Website? Here's What It's Missing",
  description: "Canva makes beautiful documents. But a portfolio website it is not. Here's the one gap that costs you interviews.",
  author: {
    '@type': 'Person',
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    url: 'https://liveportfolio.site/ezekwe',
  },
  publisher: { '@type': 'Organization', name: 'LivePortfolio', url: 'https://liveportfolio.site' },
  datePublished: '2026-07-14T00:00:00Z',
  dateModified: '2026-07-14T00:00:00Z',
  url: 'https://liveportfolio.site/blog/is-canva-a-portfolio-website',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://liveportfolio.site/blog/is-canva-a-portfolio-website' },
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
            Is Canva a Portfolio Website? Here&apos;s What It&apos;s Missing
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Canva is excellent at making things look polished. Whether it is the right tool for your career is a different question.
          </p>
          <p className="text-xs text-gray-400">5 min read</p>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-[720px] mx-auto px-5 py-12">

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Asking whether Canva is a portfolio website is one of the most common questions from job seekers who have already built something in Canva and wonder if it is enough.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          The short answer: Canva is excellent at making documents look professional. What it produces is not a website. For some situations, that is fine. For others, it is the gap that costs you the interview.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          If you are still figuring out <a href="/what-is-a-portfolio" className="text-[#0A66C2] underline underline-offset-2">what a portfolio actually is</a> and whether you need one, start there first.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What Canva Does Well</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Canva is genuinely excellent at one thing: making documents look professional without requiring design skills. You can take a portfolio template, plug in your experience, choose a colour scheme, and export something that looks polished. For a printed portfolio at an in-person interview or a PDF attachment to an email, a Canva portfolio is perfectly serviceable.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          If you are a graphic designer, illustrator, or photographer, Canva also lets you build something visually specific to your creative work in a way that a generic template might not.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What Canva Cannot Do</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          Here is where the gap opens up.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <strong>It produces a file, not a website.</strong> When someone asks for your portfolio, you ideally send them a link — a URL that opens in a browser, looks right on every screen size, and can be bookmarked and clicked from a LinkedIn message. A Canva portfolio is a PDF. You can share it via Google Drive, but what opens is a document viewer, not a website. It does not have its own URL. It does not show up in Google search for your name.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <strong>It does not tell you who is reading it.</strong> Once you send a PDF, it disappears into someone&apos;s downloads folder. You will never know if the recruiter opened it, how long they spent on it, or whether they forwarded it to a colleague. A portfolio website can tell you all of this. LivePortfolio shows you when someone from a new country opens your portfolio — in real time.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          <strong>It cannot be found.</strong> A Canva portfolio has no URL that Google can index. If a recruiter searches your name, your Canva document will not appear. A portfolio website at your own URL can rank for your name in search results.
        </p>

        <Callout emoji="💡" title="One more limitation worth knowing" color="blue">
          Updating a Canva portfolio means re-exporting a PDF, re-uploading, and sharing a new link. A portfolio website updates the moment you save — the link stays the same and anyone who has it always sees the latest version.
        </Callout>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">When Canva Is Actually Enough</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          If you are applying for roles where the hiring process is entirely email-based, where you will hand over a printed document at an interview, or where you are in a creative field where a polished PDF is the norm — Canva works. It is a good tool for a specific job.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">When You Need to Go Further</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          The moment you put a portfolio link in your LinkedIn profile, your email signature, or a job application that asks for a URL — a Canva PDF will not cut it. Those fields expect a website. A recruiter clicking a &ldquo;portfolio link&rdquo; that opens a PDF in Google Drive is a friction point you did not need to create.
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          If you are already happy with the content in your Canva portfolio, you do not have to rebuild from scratch. A <a href="/cv-to-portfolio" className="text-[#0A66C2] underline underline-offset-2">CV to portfolio website</a> takes your existing experience and builds a real, shareable website from it in minutes — no design work required.
        </p>

        <PullQuote>
          A PDF disappears into a downloads folder. A portfolio website works for you every time someone searches your name.
        </PullQuote>

        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently Asked Questions</h2>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Can I turn my Canva portfolio into a website?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Not directly within Canva. Canva has a &ldquo;Publish to web&rdquo; feature that creates a Canva-hosted page, but it lives at a canva.com URL — not your own domain — and is not treated as a proper website by Google. For a real portfolio website at your own URL, you need a dedicated portfolio builder.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Is a Canva portfolio good enough for job applications?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-6">
          It depends on the application. If the posting asks for a &ldquo;portfolio link&rdquo; or URL, a PDF will not meet the spec. If it just says &ldquo;portfolio,&rdquo; a well-designed PDF may be fine. The safest option is to have both — a PDF for when it is needed and a live website link for everywhere else.
        </p>

        <p className="text-base text-gray-700 leading-relaxed mb-2">
          <strong>Does Canva have free portfolio templates?</strong>
        </p>
        <p className="text-base text-gray-700 leading-relaxed mb-8">
          Yes — hundreds of free templates. The design quality is genuinely high. The limitation is not the design, it is the output format.
        </p>

        <KeyTakeaway>
          Canva is a great tool for creating polished PDFs. For a portfolio that has its own URL, shows up in search, and tells you who is reading it, you need a real website. If your application asks for a link, send a link — not a PDF.
        </KeyTakeaway>

        <CTASection
          headline="Turn your experience into a real portfolio website"
          sub="A live URL you can share anywhere, built from your existing experience in minutes."
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
