import Link from 'next/link'
import Logo from '@/components/Logo'

const EXAMPLE_PORTFOLIOS = [
  { name: 'Amara Osei', role: 'Frontend Developer', slug: 'amara' },
  { name: 'Benedicta Kamau', role: 'Social Media Manager & Content Strategist', slug: 'benedicta' },
  { name: 'Chukwuemeka Adeyemi', role: 'Senior Data Scientist & ML Engineer', slug: 'emeka' },
]

const FAQ_ITEMS = [
  {
    q: 'Can I preview before paying?',
    a: 'Yes. You can build and preview your portfolio before deciding to publish it.',
  },
  {
    q: 'Is hosting permanent?',
    a: 'Yes. Once published, your portfolio stays live with no monthly fee.',
  },
  {
    q: 'Can I edit my portfolio after publishing?',
    a: 'Yes. Log into your dashboard to edit any text, switch templates, or update your projects. No AI re-generation needed — changes save instantly.',
  },
  {
    q: 'What do I get when I publish?',
    a: 'Everything — a permanent live portfolio at yourname.liveportfolio.site, full editing from your dashboard, both templates, and view analytics. One plan, one price.',
  },
  {
    q: 'Who is this for?',
    a: 'Anyone who wants to present their work more clearly — developers, designers, analysts, and freelancers.',
  },
  {
    q: 'Do I need design or coding skills?',
    a: "None at all. Add your experience, pick a template, and publish when you're ready.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">

      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors hidden sm:block"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/create"
              className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              Create My Portfolio
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 pt-12 pb-12 sm:pt-20 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-full text-xs sm:text-sm text-[#0A66C2] font-medium mb-6 sm:mb-8 max-w-xs sm:max-w-none text-center">
          <span className="w-2 h-2 bg-[#0A66C2] rounded-full animate-pulse flex-shrink-0" />
          <span>Built for professionals, freelancers, and job seekers.</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0A0A0A] mb-5 sm:mb-6 leading-tight">
          Turn your experience into a portfolio recruiters can actually read and trust.
        </h1>

        <p className="text-base sm:text-xl text-gray-500 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
          Build a clean, professional portfolio in minutes.
          No writing skills. No design. No subscription.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20"
          >
            Create My Portfolio
          </Link>
          <span className="text-sm text-gray-400">One-time payment. Yours forever.</span>
        </div>

        {/* Example portfolios — horizontal scroll on mobile, 3-col grid on desktop */}
        <div className="mt-10 sm:mt-14 -mx-5 sm:mx-0 px-5 sm:px-0 flex gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible text-left">
          {EXAMPLE_PORTFOLIOS.map((p) => (
            <a
              key={p.slug}
              href={`/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group min-w-[240px] sm:min-w-0 flex-shrink-0 snap-start border border-gray-100 rounded-2xl p-4 sm:p-5 hover:border-[#0A66C2] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#084D9A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.role}</p>
                </div>
              </div>
              <p className="text-xs text-[#0A66C2] group-hover:underline truncate">View example →</p>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Tell us about your work',
                desc: 'Add your experience, projects, or upload your CV. Takes about 3 minutes.',
              },
              {
                step: '02',
                title: 'We turn it into something clear',
                desc: 'We rewrite everything into clean, professional language that sounds like you — just more structured and easier to read.',
              },
              {
                step: '03',
                title: 'Go live instantly',
                desc: 'Your portfolio goes live at yourname.liveportfolio.site. No subscription. No expiry. You stay in control.',
              },
            ].map((item) => (
              <div key={item.step} className="border border-[#0A66C2]/30 rounded-2xl p-5 sm:p-6 hover:border-[#0A66C2] transition-colors">
                <div className="text-xs font-bold text-[#0A66C2] mb-3 tracking-widest">{item.step}</div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates section */}
      <section className="py-12 sm:py-20 max-w-4xl mx-auto px-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">Two elite templates</h2>
        <p className="text-center text-gray-500 mb-8 sm:mb-12 text-sm">Switch between them instantly. No re-generation needed.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* Minimal */}
          <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex-1 bg-white p-6 sm:p-8 border-b border-gray-100">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-1">
                  <div className="h-4 bg-gray-900 rounded w-32 mb-1" style={{ borderRadius: 2 }} />
                  <div className="w-6 h-0.5 bg-[#0A66C2] my-2" />
                  <div className="h-2.5 bg-gray-300 rounded w-24" />
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-5/6 mb-5" />
              <div className="border border-gray-100 rounded-xl p-3 mb-2">
                <div className="h-2 bg-gray-800 rounded w-36 mb-2" />
                <div className="h-1.5 bg-gray-100 rounded w-full mb-1" />
                <div className="h-1.5 bg-gray-100 rounded w-4/5 mb-2" />
                <div className="flex gap-1.5">
                  {['React', 'TypeScript', 'Node'].map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="font-semibold text-gray-900 mb-0.5">Minimal</p>
              <p className="text-xs text-gray-400">Clean, editorial. Perfect for any role.</p>
            </div>
          </div>

          {/* Bold */}
          <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex-1 bg-[#0D1117] p-6 sm:p-8 border-b border-[#1C2128]">
              <div className="flex gap-4">
                <div className="w-20 sm:w-24 flex-shrink-0 flex flex-col gap-2 border-r border-[#1C2128] pr-3">
                  <div className="h-2.5 bg-[#F0F6FF] rounded w-full mb-1" />
                  <div className="h-1.5 bg-[#58A6FF] rounded w-3/4" />
                  <div className="h-px bg-[#1C2128] w-full my-1" />
                  {['About', 'Projects', 'Contact'].map((t) => (
                    <div key={t} className="h-1.5 bg-[#1C2128] rounded w-full" />
                  ))}
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0A66C2]" />
                    <div className="h-1 bg-[#0A66C2]/40 rounded w-10" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-1.5 bg-[#8B949E] rounded w-20 mb-1" />
                  <div className="h-3 bg-[#F0F6FF] rounded w-full" />
                  <div className="h-2 bg-gradient-to-r from-[#F0F6FF] to-[#58A6FF] rounded w-5/6 opacity-60" />
                  <div className="w-6 h-0.5 bg-[#58A6FF] mt-1 mb-2" />
                  <div className="bg-[#1C2128] border border-[#30363D] rounded-lg p-2.5" style={{ borderLeft: '2px solid #58A6FF' }}>
                    <div className="h-2 bg-[#F0F6FF] rounded w-3/4 mb-1.5" />
                    <div className="h-1.5 bg-[#8B949E] rounded w-full mb-1" />
                    <div className="bg-[#0D1117] border border-[#1a5fa8] rounded px-2 py-1">
                      <div className="h-1.5 bg-[#0A66C2] rounded w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="font-semibold text-gray-900 mb-0.5">Bold</p>
              <p className="text-xs text-gray-400">Dark, developer-style. Built for engineers.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-12 sm:py-20">
        <div className="max-w-lg mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">One plan. One price. Forever.</h2>
          <p className="text-center text-gray-500 mb-8 sm:mb-10 text-sm">No subscriptions. No renewals. Pay once, stay live and editable forever.</p>

          <div className="bg-white border-2 border-[#0A66C2] rounded-2xl p-6 sm:p-8">
            <div className="mb-6">
              <p className="font-bold text-gray-900 text-xl mb-1">Pro</p>
              <p className="text-sm text-gray-500 mb-3">Everything you need to look hireable online</p>
              <p className="text-4xl sm:text-5xl font-bold text-gray-900">$5 <span className="text-lg font-normal text-gray-400">one-time</span></p>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-gray-600">
              {[
                'Permanent live portfolio at yourname.liveportfolio.site',
                'Both Minimal and Bold templates — switch anytime',
                'AI improves your bio, project descriptions, and headline',
                'Edit your portfolio anytime from your dashboard',
                'View count analytics',
                'No expiry. No subscription.',
                'QR code for instant sharing — download and use anywhere',
              ].map((f) => (
                <li key={f} className="flex gap-2 items-start">
                  <span className="text-[#0A66C2] mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className="block w-full text-center py-3.5 bg-[#0A66C2] text-white rounded-full text-sm font-bold hover:bg-[#084D9A] transition-colors shadow-lg shadow-[#0A66C2]/20"
            >
              Create my portfolio →
            </Link>
            <p className="text-center text-xs text-gray-400 mt-3">Free to build and preview. Pay only to publish.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Frequently asked questions</h2>
        <div className="space-y-3 sm:space-y-5">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group border border-gray-100 rounded-xl">
              <summary className="flex items-center justify-between px-4 sm:px-5 py-4 cursor-pointer list-none gap-3">
                <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs flex-shrink-0">▼</span>
              </summary>
              <div className="px-4 sm:px-5 pb-4 text-sm text-gray-500 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-20 text-center px-5">
        <h2 className="text-2xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
          Your work is already valuable.<br className="hidden sm:block" />
          {' '}It just needs a better way to be seen.
        </h2>
        <p className="text-gray-500 mb-8 text-base sm:text-lg max-w-xl mx-auto">
          Create a recruiter-ready portfolio link you can share with confidence.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A66C2] text-white text-base font-bold rounded-full hover:bg-[#084D9A] transition-colors"
        >
          Create My Portfolio →
        </Link>
        <p className="text-gray-400 text-xs mt-4">No payment needed to see results</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise</span>
          <div className="flex gap-4">
            <a href="/blog" className="hover:text-gray-600">Blog</a>
            <a href="/terms" className="hover:text-gray-600">Terms</a>
            <a href="/privacy" className="hover:text-gray-600">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
