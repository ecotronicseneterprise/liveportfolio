import Link from 'next/link'

const EXAMPLE_PORTFOLIOS = [
  { name: 'Adaeze Okonkwo', role: 'Data Scientist', slug: 'adaeze' },
  { name: 'Emeka Nwosu', role: 'Frontend Engineer', slug: 'emeka' },
  { name: 'Tobi Adeleke', role: 'UI/UX Designer', slug: 'tobi' },
]

const FAQ_ITEMS = [
  {
    q: 'Can I preview before paying?',
    a: 'Yes. You see your full AI-generated portfolio before paying a cent. The preview is the point — it\'s where the purchase decision happens.',
  },
  {
    q: 'Is hosting permanent?',
    a: 'Yes. One payment, permanent hosting. No monthly fees, no expiry. Your portfolio stays live at slug.liveportfolio.site forever.',
  },
  {
    q: 'Can I edit my portfolio after publishing?',
    a: 'Yes. Log into your dashboard to edit any text, switch templates, or update your projects. No AI re-generation needed — changes save instantly.',
  },
  {
    q: 'What\'s the difference between Launch and Professional?',
    a: 'Launch ($9) gives you a permanent live portfolio. Professional ($19) adds custom domain support so you can use yourname.com instead.',
  },
  {
    q: 'Who is this for?',
    a: 'Tech and creative professionals — developers, data scientists, designers, engineers — who need a professional portfolio link to include in job applications.',
  },
  {
    q: 'Do I need design or coding skills?',
    a: 'None at all. Fill the form, AI writes the copy, pick a template, and it\'s live. The whole process takes under 5 minutes.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">

      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-gray-900 tracking-tight">liveportfolio.site</span>
          <Link
            href="/create"
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-full hover:bg-[#178a64] transition-colors"
          >
            Create My Portfolio
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 pt-20 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0fdf8] border border-[#1D9E75]/20 rounded-full text-sm text-[#1D9E75] font-medium mb-8">
          <span className="w-2 h-2 bg-[#1D9E75] rounded-full animate-pulse" />
          Used by 200+ tech professionals across Africa
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[#0A0A0A] mb-6 leading-tight">
          Your professional portfolio.<br />
          <span className="text-[#1D9E75]">Live in 5 minutes.</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Fill in your info. AI writes the copy. Your portfolio goes live permanently
          at <span className="text-gray-700 font-medium">yourname.liveportfolio.site</span> — one payment, no subscriptions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-4 bg-[#1D9E75] text-white text-base font-bold rounded-full hover:bg-[#178a64] transition-colors shadow-lg shadow-[#1D9E75]/20"
          >
            Create My Portfolio →
          </Link>
          <span className="text-sm text-gray-400">No design skills needed · See results before paying</span>
        </div>

        {/* Example portfolios */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {EXAMPLE_PORTFOLIOS.map((p) => (
            <a
              key={p.slug}
              href={`https://${p.slug}.liveportfolio.site`}
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-gray-100 rounded-2xl p-5 hover:border-[#1D9E75] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#0a5c42] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.role}</p>
                </div>
              </div>
              <p className="text-xs text-[#1D9E75] group-hover:underline truncate">
                {p.slug}.liveportfolio.site →
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Fill in your info',
                desc: 'Your name, role, projects, and a short bio. Takes 3 minutes. Upload your CV to auto-fill everything.',
                icon: '✍️',
              },
              {
                step: '02',
                title: 'AI writes the copy',
                desc: 'One AI call transforms your raw info into professional portfolio copy — no buzzwords, no filler. Sounds like you, written better.',
                icon: '⚡',
              },
              {
                step: '03',
                title: 'Pay once, go live forever',
                desc: 'Your portfolio publishes at yourname.liveportfolio.site permanently. No subscription, no expiry. Edit anytime from the dashboard.',
                icon: '🚀',
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-[#1D9E75] mb-2 tracking-widest">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates section */}
      <section className="py-20 max-w-4xl mx-auto px-5">
        <h2 className="text-3xl font-bold text-center mb-4">Two elite templates</h2>
        <p className="text-center text-gray-500 mb-12 text-sm">Switch between them instantly. No re-generation needed.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
            <div className="bg-white p-8 border-b border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="h-3 bg-gray-900 rounded w-28 mb-2" />
                  <div className="h-2 bg-gray-300 rounded w-20" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100" />
              </div>
              <div className="h-2 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 rounded w-5/6 mb-4" />
              <div className="flex gap-1.5">
                {['React', 'Python', 'SQL'].map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-400">{t}</span>
                ))}
              </div>
            </div>
            <div className="p-5">
              <p className="font-semibold text-gray-900 mb-1">Minimal</p>
              <p className="text-xs text-gray-400">Editorial minimalism. Playfair Display + DM Sans. White background, teal accent. Trusted by hiring managers.</p>
            </div>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
            <div className="bg-[#0D1117] p-8 border-b border-[#1C2128]">
              <div className="flex gap-4">
                <div className="w-20 flex-shrink-0 flex flex-col gap-2 border-r border-[#1C2128] pr-3">
                  <div className="h-2 bg-[#58A6FF] rounded w-full" />
                  {['About', 'Work', 'Contact'].map((t) => (
                    <div key={t} className="h-1.5 bg-[#1C2128] rounded w-full" />
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-2.5 bg-[#F0F6FF] rounded w-3/4" />
                  <div className="h-1.5 bg-[#8B949E] rounded w-full" />
                  <div className="bg-[#1C2128] border-l-2 border-[#58A6FF] rounded p-2 mt-1">
                    <div className="h-1.5 bg-[#3FB950] rounded w-2/3" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="font-semibold text-gray-900 mb-1">Bold</p>
              <p className="text-xs text-gray-400">Dark engineering showcase. Space Mono + Sora. GitHub-style dark theme with blue accents. Built for developers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, one-time pricing</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">No subscriptions. No renewals. Pay once, stay live forever.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="mb-6">
                <p className="font-bold text-gray-900 text-lg mb-1">Launch</p>
                <p className="text-4xl font-bold text-gray-900">$9 <span className="text-base font-normal text-gray-400">one-time</span></p>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                {[
                  'Permanent hosting at yourname.liveportfolio.site',
                  'Both Minimal and Bold templates',
                  'AI-generated portfolio copy',
                  'Edit anytime from dashboard',
                  'View count analytics',
                ].map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <span className="text-[#1D9E75] mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/create"
                className="block w-full text-center py-3 border-2 border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors"
              >
                Get started →
              </Link>
            </div>

            <div className="bg-white border-2 border-[#1D9E75] rounded-2xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
              </div>
              <div className="mb-6">
                <p className="font-bold text-gray-900 text-lg mb-1">Professional</p>
                <p className="text-4xl font-bold text-gray-900">$19 <span className="text-base font-normal text-gray-400">one-time</span></p>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                {[
                  'Everything in Launch',
                  'Custom domain support (yourname.com)',
                  'Priority email support',
                  'Future premium templates included',
                ].map((f) => (
                  <li key={f} className="flex gap-2 items-start">
                    <span className="text-[#1D9E75] mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/create"
                className="block w-full text-center py-3 bg-[#1D9E75] text-white rounded-full text-sm font-bold hover:bg-[#178a64] transition-colors shadow-lg shadow-[#1D9E75]/20"
              >
                Get started →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
        <div className="space-y-5">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group border border-gray-100 rounded-xl">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0A0A0A] py-20 text-center px-5">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          The fastest way to look hireable online.
        </h2>
        <p className="text-gray-400 mb-8 text-lg">
          5 minutes. AI-generated copy. Live permanently.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#1D9E75] text-white text-base font-bold rounded-full hover:bg-[#178a64] transition-colors"
        >
          Create My Portfolio →
        </Link>
        <p className="text-gray-600 text-xs mt-4">No payment needed to see results</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise. Built by Clifford Nwanna.</span>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-gray-600">Terms</a>
            <a href="/privacy" className="hover:text-gray-600">Privacy</a>
            <a href="https://liveportfolio.site" className="hover:text-gray-600">Built with liveportfolio.site</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
