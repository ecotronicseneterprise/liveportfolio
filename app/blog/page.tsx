import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — LivePortfolio',
  description: 'Guides on building a tech portfolio, landing remote jobs, and standing out to global recruiters. Practical advice for developers and job seekers.',
  openGraph: {
    title: 'Blog — LivePortfolio',
    description: 'Guides on building a tech portfolio and standing out to global recruiters.',
    url: 'https://liveportfolio.site/blog',
    siteName: 'LivePortfolio',
  },
  alternates: {
    canonical: 'https://liveportfolio.site/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — LivePortfolio',
    description: 'Guides on building a tech portfolio and standing out to global recruiters.',
  },
}

const ARTICLES = [
  {
    slug: 'how-to-create-a-developer-portfolio',
    title: 'How to Create a Developer Portfolio That Gets You Hired',
    description: 'The 6 sections every portfolio needs, the mistakes that get you skipped, and how to build one in under an hour.',
    time: '6 min',
    category: 'Portfolio basics',
  },
  {
    slug: 'how-to-get-a-remote-tech-job-from-nigeria',
    title: 'How to Get a Remote Tech Job From Nigeria in 2026',
    description: 'The skills that get hired, where to apply, and why 100 applications before your first offer is completely normal.',
    time: '7 min',
    category: 'Remote work',
  },
  {
    slug: 'portfolio-tips-for-african-tech-professionals',
    title: 'Portfolio Tips for African Tech Professionals',
    description: 'How to present your work to global recruiters, frame outcomes with numbers, and signal that you are ready for remote roles.',
    time: '5 min',
    category: 'Career tips',
  },
  {
    slug: 'what-recruiters-look-for-in-a-portfolio',
    title: 'What Recruiters Actually Look For in a Portfolio',
    description: 'A recruiter has 7 seconds. Here is exactly what they are looking for, and the red flags that get you skipped.',
    time: '5 min',
    category: 'Recruiter insight',
  },
  {
    slug: 'portfolio-for-bootcamp-graduates',
    title: 'How Bootcamp Graduates Can Build a Portfolio With Little Experience',
    description: 'You have more to show than you think. Here is how to turn coursework and side projects into a portfolio that gets responses.',
    time: '6 min',
    category: 'For beginners',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Portfolio basics': 'bg-[#E8F0F9] text-[#0A66C2]',
  'Remote work': 'bg-purple-50 text-purple-700',
  'Career tips': 'bg-green-50 text-green-700',
  'Recruiter insight': 'bg-amber-50 text-amber-700',
  'For beginners': 'bg-pink-50 text-pink-700',
}

export default function BlogIndex() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#E8F0F9] px-5 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest mb-3">
            The liveportfolio.site blog
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4 leading-tight">
            Guides for landing your next tech role
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Practical, honest articles for developers, designers, and analysts who want to get hired faster.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <div className="grid gap-5">
          {ARTICLES.map((article, i) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group block border border-gray-100 rounded-2xl p-6 hover:border-[#0A66C2] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[article.category]}`}>
                  {article.category}
                </span>
                <span className="text-xs text-gray-400">{article.time} read</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#0A66C2] transition-colors mb-2 leading-snug">
                {i + 1}. {article.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{article.description}</p>
              <p className="text-xs text-[#0A66C2] mt-3 font-medium group-hover:underline">
                Read article →
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Ready to build your portfolio?</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A66C2] text-white text-sm font-bold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Create my portfolio →
          </Link>
        </div>
      </section>
    </div>
  )
}
