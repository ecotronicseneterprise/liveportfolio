import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import SupportButton from '@/components/SupportButton'

export const metadata: Metadata = {
  title: 'CV to Portfolio Website Converter — Free to Try | LivePortfolio',
  description: 'Turn your CV into a professional portfolio website in minutes. AI writes your story, you publish a live link. Free to build and preview — no credit card needed.',
  alternates: { canonical: 'https://liveportfolio.site/cv-to-portfolio' },
  openGraph: {
    title: 'CV to Portfolio Website Converter | LivePortfolio',
    description: 'Turn your CV into a professional portfolio website in minutes. Free to build and preview.',
    url: 'https://liveportfolio.site/cv-to-portfolio',
    type: 'website',
  },
}

const FAQ_ITEMS = [
  {
    q: 'Is this different from just uploading my CV as a PDF to a website?',
    a: 'Yes. A PDF is a document pretending to be a webpage — it\'s not indexed properly, doesn\'t look good on mobile, and gives you zero data on who\'s viewing it. LivePortfolio builds an actual website with a real URL, optimized for both recruiters and search engines.',
  },
  {
    q: 'Do I need any design experience?',
    a: 'No. The AI handles the writing, and you choose from professionally designed templates. You never touch a design tool.',
  },
  {
    q: 'How long does it actually take?',
    a: 'Most people go from CV upload to a finished, previewable portfolio in under 5 minutes. Publishing it live takes as long as it takes you to pick a plan.',
  },
  {
    q: 'Is it free?',
    a: 'Building and previewing your portfolio is completely free. You only pay when you\'re ready to publish it live and make it shareable.',
  },
]

export default function CvToPortfolioPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-14 sm:pt-20 pb-12 sm:pb-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs text-[#0A66C2] font-medium mb-7">
            <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
            CV to portfolio — in minutes
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A0A0A] leading-[1.05] mb-6">
            Turn Your CV Into a Portfolio Website in 5 Minutes
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-2xl">
            You already did the hard part — building the experience. LivePortfolio takes your CV and turns it into a portfolio website that actually gets read, not just filed away.
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
      </section>

      {/* ── Problem ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">The problem with sending a CV</h2>
          <div className="max-w-2xl">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">A CV is a list. A portfolio is proof.</p>
            <p className="text-base text-gray-500 leading-[1.8] mb-4">
              Recruiters spend seconds on a CV before deciding whether to keep reading. A portfolio gives them something a CV can't: a reason to remember you after they've closed the tab. But building one from scratch takes design skills, a free weekend, and more patience than most job searches leave you with.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                step: '01',
                title: 'Upload your CV',
                desc: 'PDF or Word, doesn\'t matter. We read it so you don\'t have to retype your whole career history into another form.',
              },
              {
                step: '02',
                title: 'AI writes your story',
                desc: 'LivePortfolio\'s AI turns your bullet points into a portfolio that reads like a person wrote it — because it\'s built to sound like you, not like a template.',
              },
              {
                step: '03',
                title: 'Publish and share',
                desc: 'Get a live link at liveportfolio.site/yourname. Put it in your email signature, your LinkedIn, your next application. Free to preview before you ever pay anything.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`p-8 sm:p-10 bg-white${i < 2 ? ' border-b sm:border-b-0 sm:border-r border-gray-200' : ''}`}
              >
                <div className="text-sm font-bold text-[#0A66C2] tracking-widest mb-4">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-base text-gray-500 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-8">What you get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            {[
              'A live, mobile-responsive portfolio website — not a PDF, not a static image',
              'AI-written professional copy based on your actual experience',
              'Visitor analytics — know when someone from a new country opens your portfolio',
              'A shareable link that works everywhere a CV attachment doesn\'t',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-5 border border-gray-100 rounded-2xl bg-white">
                <span className="text-[#0A66C2] font-bold flex-shrink-0 mt-0.5">✓</span>
                <span className="text-base text-gray-700 leading-[1.6]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <h2 className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Who this is built for</h2>
          <p className="text-base text-gray-500 leading-[1.8] max-w-2xl">
            Built for developers, designers, product managers, and data professionals — especially African tech talent applying for remote roles globally, where a strong portfolio link often matters more than a formatted resume.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="w-full border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
          <p className="text-sm font-bold text-[#0A66C2] tracking-widest uppercase mb-4">FAQ</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={item.q}
                className={`group bg-white${i % 2 === 0 ? ' lg:border-r border-gray-100' : ''}${i < FAQ_ITEMS.length - 2 ? ' border-b border-gray-100' : ''}`}
              >
                <summary className="flex items-center justify-between px-6 sm:px-8 py-5 cursor-pointer list-none gap-4">
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs flex-shrink-0">▼</span>
                </summary>
                <div className="px-6 sm:px-8 pb-5 text-base text-gray-600 leading-[1.7]">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:text-center lg:flex lg:flex-col lg:items-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#0A0A0A] leading-tight mb-4">
            Your CV already has everything you need.
          </h2>
          <p className="text-lg sm:text-xl font-medium text-gray-600 mb-8">
            Let us turn it into a portfolio that actually gets seen.
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
