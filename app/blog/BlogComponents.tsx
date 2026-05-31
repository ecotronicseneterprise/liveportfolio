import Link from 'next/link'

export function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-4 border-[#0A66C2] pl-6 my-8">
      <p className="text-xl text-gray-800 font-medium leading-relaxed">{children}</p>
    </blockquote>
  )
}

export function Callout({
  emoji,
  title,
  children,
  color = 'blue',
}: {
  emoji: string
  title: string
  children: React.ReactNode
  color?: 'blue' | 'amber' | 'green'
}) {
  const styles = {
    blue: 'bg-[#E8F0F9] border-[#0A66C2]/20',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
  }
  return (
    <div className={`border rounded-2xl p-5 my-6 ${styles[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

export function StepCard({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 bg-[#0A66C2] text-white rounded-full flex items-center justify-center text-sm font-bold mt-1">
        {number}
      </div>
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="my-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="text-[#0A66C2] flex-shrink-0 font-bold mt-0.5">✓</span>
          <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function KeyTakeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0A66C2] text-white rounded-2xl p-6 my-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💡</span>
        <span className="font-bold text-xs uppercase tracking-widest opacity-80">Key Takeaway</span>
      </div>
      <div className="text-sm leading-relaxed opacity-95">{children}</div>
    </div>
  )
}

export function CTASection({ headline, sub }: { headline: string; sub: string }) {
  return (
    <div className="bg-[#E8F0F9] border border-[#0A66C2]/20 rounded-2xl p-8 my-10 text-center">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{headline}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">{sub}</p>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A66C2] text-white text-sm font-bold rounded-full hover:bg-[#084D9A] transition-colors"
      >
        Create my portfolio →
      </Link>
      <p className="text-xs text-gray-400 mt-3">Free to build and preview. Pay only to publish.</p>
    </div>
  )
}

export function RelatedArticles({
  articles,
}: {
  articles: { title: string; slug: string; time: string }[]
}) {
  return (
    <div className="border-t border-gray-100 pt-10 mt-10">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-5">
        Keep reading
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/blog/${a.slug}`}
            className="group block border border-gray-100 rounded-xl p-4 hover:border-[#0A66C2] hover:shadow-sm transition-all"
          >
            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0A66C2] transition-colors leading-snug mb-1">
              {a.title}
            </p>
            <p className="text-xs text-gray-400">{a.time} read</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
