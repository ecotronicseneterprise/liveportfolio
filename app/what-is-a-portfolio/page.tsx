import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import SupportButton from '@/components/SupportButton'

export const metadata: Metadata = {
  title: 'What Is a Portfolio? The Complete Guide for Professionals | LivePortfolio',
  description: 'A portfolio is a curated collection of your best work that proves your skills to employers. Learn what a professional portfolio needs, what to include, and how to build one in minutes.',
  alternates: { canonical: 'https://liveportfolio.site/what-is-a-portfolio' },
  openGraph: {
    title: 'What Is a Portfolio? The Complete Guide | LivePortfolio',
    description: 'Learn what a professional portfolio is, what to include, and how to build one in minutes — no design skills needed.',
    url: 'https://liveportfolio.site/what-is-a-portfolio',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between a portfolio and a CV?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A CV lists your experience and qualifications in a standardised format. A portfolio shows the actual work — projects, outcomes, and evidence of what you can do. A CV tells employers what you did; a portfolio proves you can do it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a portfolio have to be a website?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Not necessarily — a PDF portfolio works in some contexts. But a website portfolio is stronger for most situations: it has its own URL, appears in Google search for your name, and lets you track who is viewing it.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many projects should a portfolio have?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Two to four is the right range for most professionals. Two shows you have built real things. Four shows breadth. More than six starts to feel unfocused — quality over quantity always.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I have a portfolio with no work experience?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Personal projects, coursework, freelance gigs, open-source contributions, and hackathon entries all count as portfolio material. No experience usually means no full-time job title — not no work to show.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LinkedIn a portfolio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LinkedIn is a discovery platform — it is where people find you. A portfolio is what you show them once they find you. They work best together: LinkedIn gets you found, your portfolio does the convincing.',
      },
    },
  ],
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://liveportfolio.site' },
    { '@type': 'ListItem', position: 2, name: 'What Is a Portfolio?', item: 'https://liveportfolio.site/what-is-a-portfolio' },
  ],
}

const FAQ_ITEMS = [
  {
    q: 'What is the difference between a portfolio and a CV?',
    a: 'A CV lists your experience and qualifications in a standardised format. A portfolio shows the actual work — projects, outcomes, and evidence of what you can do. A CV tells employers what you did; a portfolio proves you can do it.',
  },
  {
    q: 'Does a portfolio have to be a website?',
    a: 'Not necessarily — a PDF portfolio works in some contexts (printed materials for in-person interviews). But a website portfolio is stronger for most situations: it has its own URL, appears in Google search for your name, and lets you track who is viewing it.',
  },
  {
    q: 'How many projects should a portfolio have?',
    a: 'Two to four is the right range for most professionals. Two shows you have built real things. Four shows breadth. More than six starts to feel unfocused — quality over quantity always.',
  },
  {
    q: 'Can I have a portfolio with no work experience?',
    a: 'Yes. Personal projects, coursework, freelance gigs, open-source contributions, and hackathon entries all count as portfolio material. "No experience" usually means no full-time job title — not no work to show.',
  },
  {
    q: 'Is LinkedIn a portfolio?',
    a: 'LinkedIn is a discovery platform — it is where people find you. A portfolio is what you show them once they find you. They work best together: LinkedIn gets you found, your portfolio does the convincing.',
  },
]

export default function WhatIsAPortfolioPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
            <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
            The complete guide
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">
            What Is a Portfolio? The Complete Guide for Professionals
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl">
            A portfolio is a curated collection of your best professional work, designed to show employers and clients what you can actually do — not just what you claim on a CV.
          </p>
        </div>
      </section>

      {/* ── Portfolio vs CV ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Portfolio vs CV — the core difference</h2>
          <div className="max-w-2xl">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">A CV lists your experience. A portfolio proves it.</p>
            <p className="text-base text-gray-500 leading-[1.8] mb-4">
              When you write "3 years of experience in data analysis" on a CV, a recruiter has to take your word for it. When you show a portfolio with three real data projects — the problem you solved, the method you used, and the outcome you produced — the same claim becomes verifiable evidence.
            </p>
            <p className="text-base text-gray-500 leading-[1.8]">
              This is why portfolios matter more than ever. In competitive job markets, especially for remote roles where employers cannot meet you in person, a portfolio is often the difference between a shortlisted application and a rejected one.
            </p>
          </div>
        </div>
      </section>

      {/* ── Types of portfolios ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What types of portfolios exist?</h2>
          <p className="text-base text-gray-500 leading-[1.8] mb-8 max-w-2xl">
            The word "portfolio" means different things in different fields. Here are the four most common types:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-gray-200 rounded-2xl overflow-hidden max-w-3xl">
            {[
              {
                title: 'Professional portfolio',
                desc: 'A website or document that presents your work experience, projects, and skills to potential employers. This is the most common type and the one this guide focuses on.',
                highlight: true,
              },
              {
                title: 'Creative portfolio',
                desc: 'Used by designers, illustrators, photographers, and artists to showcase visual work. Typically image-heavy and design-forward.',
                highlight: false,
              },
              {
                title: 'Academic portfolio',
                desc: 'Used by students and academics to present research, coursework, and publications.',
                highlight: false,
              },
              {
                title: 'Investment portfolio',
                desc: 'A collection of financial assets (stocks, bonds, etc.). A completely different meaning used in finance — not what this guide covers.',
                highlight: false,
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`p-8 bg-white${i < 2 ? ' border-b sm:border-b-0' : ''}${i % 2 === 0 ? ' sm:border-r' : ''} border-gray-200`}
              >
                {item.highlight && (
                  <span className="inline-block text-xs font-semibold text-[#0A66C2] bg-[#E8F0F9] px-2.5 py-0.5 rounded-full mb-3">This guide</span>
                )}
                <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What to include ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What should a professional portfolio include?</h2>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 max-w-2xl">Five elements every strong portfolio needs</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200 rounded-2xl overflow-hidden max-w-4xl">
            {[
              {
                step: '01',
                title: 'A clear professional headline',
                desc: 'Who you are and what you do. One sentence. Specific: "Full-Stack Developer specialising in React and Node.js" — not "Software Engineer."',
              },
              {
                step: '02',
                title: 'Two to four project case studies',
                desc: 'For each project: what problem it solved, what you built, what technologies you used, and what the outcome was. Measurable outcomes are stronger than vague ones.',
              },
              {
                step: '03',
                title: 'A skills section',
                desc: 'Technologies, tools, and methods you are genuinely proficient in. Not a wish list — only things you could be asked about in an interview tomorrow.',
              },
            ].map((item, i) => (
              <div key={item.step} className={`p-8 bg-white${i < 2 ? ' border-b sm:border-b-0 sm:border-r' : ''} border-gray-200`}>
                <div className="text-sm font-bold text-[#0A66C2] tracking-widest mb-4">{item.step}</div>
                <h3 className="text-base font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-gray-200 border-t-0 rounded-b-2xl overflow-hidden max-w-4xl">
            {[
              {
                step: '04',
                title: 'A brief professional bio',
                desc: 'Two or three sentences about who you are, what you are looking for, and any relevant context — location, availability for remote work.',
              },
              {
                step: '05',
                title: 'Contact information',
                desc: 'An email address and links to LinkedIn and GitHub. Make it easy for someone to reach you in one click — your email should be visible without scrolling.',
              },
            ].map((item, i) => (
              <div key={item.step} className={`p-8 bg-white${i === 0 ? ' border-b sm:border-b-0 sm:border-r' : ''} border-gray-200`}>
                <div className="text-sm font-bold text-[#0A66C2] tracking-widest mb-4">{item.step}</div>
                <h3 className="text-base font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What makes it effective ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">What makes a portfolio effective?</h2>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 max-w-2xl">The portfolios that get responses share three qualities</p>
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">They show outcomes, not just tasks</h3>
              <p className="text-sm text-gray-500 leading-[1.7]">
                "Built an e-commerce platform" is a task. "Built an e-commerce platform that handled 200 orders per day and reduced cart abandonment by 23%" is an outcome. Outcomes give employers something concrete to evaluate.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">They are easy to read in 30 seconds</h3>
              <p className="text-sm text-gray-500 leading-[1.7]">
                Most recruiters spend less than a minute on any single application. A portfolio that requires deep reading to understand what you do is a portfolio that gets closed. Lead with your clearest, most impressive work.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">They are live on the web</h3>
              <p className="text-sm text-gray-500 leading-[1.7]">
                A PDF portfolio cannot be linked to, does not appear in Google search for your name, and gives you no data on who viewed it. A portfolio website at your own URL is findable, shareable, and trackable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Do you need one ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Do you need a portfolio?</h2>
          <div className="max-w-2xl">
            <p className="text-base text-gray-500 leading-[1.8] mb-6">
              Not everyone needs a portfolio in the same way, but most professionals benefit from having one.
            </p>
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-gray-100 bg-[#E8F0F9]">
                <p className="text-sm font-semibold text-[#0A66C2] mb-1">You definitely need one if:</p>
                <ul className="text-sm text-gray-600 leading-[1.8] space-y-1">
                  <li>You are applying for remote jobs, especially international ones</li>
                  <li>You work in tech, design, or any field where your output can be shown directly</li>
                  <li>You are early in your career and want to demonstrate skills beyond a short CV</li>
                  <li>You are a freelancer looking for clients</li>
                </ul>
              </div>
              <div className="px-6 py-5 bg-white">
                <p className="text-sm font-semibold text-gray-700 mb-1">It is less critical if:</p>
                <p className="text-sm text-gray-500 leading-[1.8]">
                  You are in a field where credentials and references are the primary evaluation criteria — law, medicine, academic research. Though even in these fields, a professional online presence helps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to build ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">How to build a portfolio</h2>
          <div className="max-w-2xl">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">From blank page to live portfolio in 5 minutes</p>
            <p className="text-base text-gray-500 leading-[1.8] mb-4">
              Building a portfolio used to mean hiring a web developer, paying for hosting, or spending a weekend fighting with website builders. That has changed.
            </p>
            <p className="text-base text-gray-500 leading-[1.8] mb-8">
              LivePortfolio generates a complete professional portfolio from your CV in under 5 minutes. Upload your CV — we write the professional copy, design the layout, and publish a live portfolio at liveportfolio.site/yourname. No design skills, no coding, no blank page.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20 self-start"
              >
                Build My Portfolio →
              </Link>
              <span className="text-sm text-gray-400">Free to build and preview. No credit card needed.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Common questions</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden max-w-4xl">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={item.q}
                className={`group bg-white${i % 2 === 0 ? ' lg:border-r border-gray-100' : ''}${i < FAQ_ITEMS.length - 2 ? ' border-b border-gray-100' : ''}`}
              >
                <summary className="flex items-center justify-between px-6 sm:px-8 py-5 cursor-pointer list-none gap-4">
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs flex-shrink-0">▼</span>
                </summary>
                <div className="px-6 sm:px-8 pb-5 text-sm text-gray-600 leading-[1.7]">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] leading-tight mb-4">
            Ready to build yours?
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl">
            Upload your CV and we turn it into a professional portfolio in minutes — with AI-written copy, beautiful templates, and a live URL you can share today.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Build My Portfolio →
          </Link>
          <p className="text-sm text-gray-400 mt-4">Free to build and preview. No credit card needed.</p>
        </div>
      </section>

      <SupportButton />

      {/* ── Footer ── */}
      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-6">
            <a href="/blog" className="hover:text-gray-600 transition-colors">Blog</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
