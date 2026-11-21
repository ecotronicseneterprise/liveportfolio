import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CopyButton from '@/components/docs/CopyButton'
import { DOC_PAGES, docBySlug } from '@/lib/docs/pages'

export const dynamicParams = false
export const generateStaticParams = () => DOC_PAGES.map((p) => ({ slug: p.slug }))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = docBySlug((await params).slug)
  if (!p) return {}
  return { title: `${p.title} | LivePortfolio docs`, description: p.description, alternates: { canonical: `/docs/${p.slug}` } }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = docBySlug((await params).slug)
  if (!page) notFound()
  const i = DOC_PAGES.findIndex((p) => p.slug === page.slug)
  const next = DOC_PAGES[i + 1]
  return (
    <main>
      <p className="text-sm font-semibold text-neutral-500">{page.group}</p>
      <h1 className="mt-1 text-3xl font-semibold">{page.title}</h1>
      <p className="mt-2 text-lg text-neutral-700">{page.description}</p>
      <div className="mt-6 space-y-4">
        {page.blocks.map((b, k) => {
          switch (b.t) {
            case 'h': return <h2 key={k} className="pt-4 text-xl font-semibold">{b.text}</h2>
            case 'p': return <p key={k} className="text-neutral-800">{b.text}</p>
            case 'ul': return <ul key={k} className="list-disc space-y-1 pl-6">{b.items.map((s) => <li key={s}>{s}</li>)}</ul>
            case 'ol': return <ol key={k} className="list-decimal space-y-2 pl-6">{b.items.map((s) => <li key={s}>{s}</li>)}</ol>
            case 'note': return <p key={k} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">{b.text}</p>
            case 'code': return (
              <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <code className="min-w-0 break-all text-sm">{b.text}</code>
                <CopyButton text={b.text} />
              </div>
            )
          }
        })}
      </div>
      {next && <p className="mt-10 text-sm"><a className="underline" href={`/docs/${next.slug}`}>Next: {next.title} →</a></p>}
    </main>
  )
}
